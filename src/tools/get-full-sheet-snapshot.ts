import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { gridRangeToA1, findSheetOrThrow } from '../utils/range-helpers.js';
import { extractFormatFields, compactifyCellFormatting } from '../utils/compact-format.js';
import { normalizeConditionalFormatFormulas } from '../utils/formula-locale.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
  includeFormattingRange: z.string().optional(),
  useEffectiveFormat: z.boolean().optional().default(false),
  fields: z.array(z.string()).optional(),
  compactMode: z.boolean().optional().default(false),
  includeConditionalFormatting: z.boolean().optional().default(true),
});

export const getFullSheetSnapshotTool: Tool = {
  name: 'sheets_get_full_sheet_snapshot',
  description:
    'One-shot tool: reads all structural and formatting metadata for a sheet in a single API call. ' +
    'Returns: sheet properties (frozen rows/cols, dimensions, tab color), ' +
    'merged cells, column widths, row heights, banded ranges, ' +
    'and optionally cell-level formatting for a specified range (includeFormattingRange). ' +
    'compactMode is OFF by default — full per-cell detail is returned unless compactMode:true is provided. ' +
    'When compactMode is ON, adjacent cells with identical formatting are collapsed into range descriptors (90%+ smaller output). ' +
    'Conditional formatting rules are included by default (includeConditionalFormatting:true); set to false to exclude them. CF formulas are normalized to English locale (commas). ' +
    'Use fields to limit which format properties are returned. ' +
    'Use this before programmatically recreating a sheet.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetName: {
        type: 'string',
        description: 'Name of the sheet (tab) to snapshot',
      },
      includeFormattingRange: {
        type: 'string',
        description:
          'Optional range WITHOUT sheet prefix (e.g. "A1:Z85") to include cell-level formatting. ' +
          'If omitted, only structural metadata is returned.',
      },
      useEffectiveFormat: {
        type: 'boolean',
        description:
          'If includeFormattingRange is set: use effectiveFormat (true) or userEnteredFormat (false, default).',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional list of format field names to include, e.g. ["backgroundColor", "textFormat", "borders"]. ' +
          'Reduces response size by excluding unused format properties. All fields returned if omitted.',
      },
      compactMode: {
        type: 'boolean',
        description:
          'Default: false. Full per-cell formatting is returned unless compactMode:true is set. ' +
          'When true, adjacent cells with identical formatting are collapsed into range descriptors ' +
          '(run-length encoded), reducing output by 90%+ for typical formatted sheets. ' +
          'Only applies when includeFormattingRange is set.',
      },
      includeConditionalFormatting: {
        type: 'boolean',
        description:
          'Default: true. Include conditional formatting rules and banded ranges in the snapshot. ' +
          'CF formulas are normalized to English locale (semicolons → commas). ' +
          'Set to false to reduce output size when CF rules are not needed.',
      },
    },
    required: ['spreadsheetId', 'sheetName'],
  },
};

export async function handleGetFullSheetSnapshot(input: any): Promise<ToolResponse> {
  try {
    const {
      spreadsheetId,
      sheetName,
      includeFormattingRange,
      useEffectiveFormat,
      fields: formatFields,
      compactMode,
      includeConditionalFormatting,
    } = inputSchema.parse(input);

    const sheets = await getAuthenticatedClient();

    const baseFields =
      'sheets.properties,' +
      'sheets.merges,' +
      'sheets.data.columnMetadata,' +
      'sheets.data.rowMetadata,' +
      'sheets.conditionalFormats,' +
      'sheets.bandedRanges';

    const formatField = useEffectiveFormat ? 'effectiveFormat' : 'userEnteredFormat';
    const compact = compactMode === true;

    // Build cell-level fields mask — use per-field paths when caller specifies a filter
    let cellDataFields: string;
    if (formatFields && formatFields.length > 0) {
      cellDataFields = formatFields
        .map((f) => `sheets.data.rowData.values.${formatField}.${f}`)
        .join(',');
    } else {
      cellDataFields = `sheets.data.rowData.values.${formatField}`;
    }
    const cellFormattingFields = includeFormattingRange
      ? `,${cellDataFields},sheets.data.startRow,sheets.data.startColumn`
      : '';

    const fullRangeParam = includeFormattingRange
      ? [`${sheetName}!${includeFormattingRange}`]
      : undefined;

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ...(fullRangeParam ? { ranges: fullRangeParam } : {}),
      includeGridData: !!includeFormattingRange,
      fields: baseFields + cellFormattingFields,
    });

    const sheetData = findSheetOrThrow(response.data.sheets ?? [], sheetName);

    const props = sheetData.properties!;
    const gridProps = props.gridProperties ?? {};
    const gridData = sheetData.data?.[0] ?? {};

    // ── Merges ──
    const merges = (sheetData.merges ?? []).map((m: sheets_v4.Schema$GridRange) => ({
      a1Notation: gridRangeToA1(m),
      startRowIndex: m.startRowIndex,
      endRowIndex: m.endRowIndex,
      startColumnIndex: m.startColumnIndex,
      endColumnIndex: m.endColumnIndex,
    }));

    // ── Column dimensions ──
    const columns = (gridData.columnMetadata ?? []).map(
      (col: sheets_v4.Schema$DimensionProperties, i: number) => ({
        index: i,
        pixelSize: col.pixelSize ?? null,
        hiddenByUser: col.hiddenByUser ?? false,
      })
    );

    // ── Row dimensions ──
    const rows = (gridData.rowMetadata ?? []).map(
      (row: sheets_v4.Schema$DimensionProperties, i: number) => ({
        index: i,
        pixelSize: row.pixelSize ?? null,
        hiddenByUser: row.hiddenByUser ?? false,
      })
    );

    // ── Cell formatting (optional) ──
    let cellFormatting: any = null;
    if (includeFormattingRange && gridData.rowData) {
      const startRow = gridData.startRow ?? 0;
      const startColumn = gridData.startColumn ?? 0;

      if (compact) {
        cellFormatting = compactifyCellFormatting(
          gridData.rowData,
          startRow,
          startColumn,
          useEffectiveFormat,
          formatFields
        );
      } else {
        cellFormatting = gridData.rowData.map(
          (rowData: sheets_v4.Schema$RowData, rowOffset: number) =>
            (rowData.values ?? []).map((cell: sheets_v4.Schema$CellData, colOffset: number) => {
              const fmt = useEffectiveFormat ? cell.effectiveFormat : cell.userEnteredFormat;
              if (!fmt) {
                return null;
              }
              const extracted = extractFormatFields(fmt, formatFields);
              if (Object.keys(extracted).length === 0) {
                return null;
              }
              return { row: startRow + rowOffset, col: startColumn + colOffset, ...extracted };
            })
        );
      }
    }

    const rawConditionalFormats: any[] = sheetData.conditionalFormats ?? [];
    const cfSection = includeConditionalFormatting
      ? {
          conditionalFormats: rawConditionalFormats.map(normalizeConditionalFormatFormulas),
          bandedRanges: sheetData.bandedRanges ?? [],
        }
      : {};

    const snapshot = {
      sheetName,
      sheetId: props.sheetId,
      tabColor: props.tabColor ?? null,
      tabColorStyle: props.tabColorStyle ?? null,
      frozenRowCount: gridProps.frozenRowCount ?? 0,
      frozenColumnCount: gridProps.frozenColumnCount ?? 0,
      totalRows: gridProps.rowCount ?? null,
      totalColumns: gridProps.columnCount ?? null,
      mergeCount: merges.length,
      merges,
      columns,
      rows,
      ...cfSection,
      ...(cellFormatting !== null
        ? {
            cellFormatting: {
              range: `${sheetName}!${includeFormattingRange}`,
              formatType: formatField,
              compact,
              data: cellFormatting,
            },
          }
        : {}),
    };

    return formatSuccessResponse(
      snapshot,
      `Full snapshot for sheet "${sheetName}" — ${merges.length} merges, ` +
        `${columns.length} columns, ${rows.length} rows`
    );
  } catch (error) {
    return handleError(error);
  }
}
