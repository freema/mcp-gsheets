import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { columnToIndex, colIndexToLetter } from '../utils/range-helpers.js';
import { extractFormatFields } from '../utils/compact-format.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  rangeA: z.string().describe('First range with sheet prefix, e.g. "Sheet1!A6:Z6"'),
  rangeB: z.string().describe('Second range with sheet prefix, e.g. "Sheet1!A7:Z7"'),
  fields: z.array(z.string()).optional(),
  useEffectiveFormat: z.boolean().optional().default(false),
  mode: z
    .enum(['row-by-row', 'full'])
    .optional()
    .default('row-by-row')
    .describe(
      '"row-by-row": compare each row in rangeA against corresponding row in rangeB. ' +
        '"full": compare the entire formatting of rangeA against rangeB as blocks.'
    ),
});

export const compareRangesTool: Tool = {
  name: 'sheets_compare_ranges',
  description:
    'Compare cell formatting between two ranges. ' +
    'Useful for verifying repeated patterns, e.g. "do all data rows 6–85 have identical formatting?" ' +
    'or "is row 10 formatted identically to the template row 5?". ' +
    'Returns a diff listing only the cells and properties that differ between the two ranges. ' +
    'When ranges have the same dimensions, cells are compared position-by-position. ' +
    'Use mode:"row-by-row" to compare row N of rangeA with row N of rangeB (default). ' +
    'Use fields to restrict comparison to specific format properties.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      rangeA: {
        type: 'string',
        description: 'First range with sheet prefix, e.g. "Sheet1!A6:Z6"',
      },
      rangeB: {
        type: 'string',
        description: 'Second range with sheet prefix, e.g. "Sheet1!A7:Z7"',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional list of format property names to compare, e.g. ["backgroundColor", "textFormat"]. ' +
          'All format properties compared if omitted.',
      },
      useEffectiveFormat: {
        type: 'boolean',
        description:
          'Default: false. Compare effectiveFormat (true) or userEnteredFormat (false). ' +
          'effectiveFormat includes conditional formatting overlays.',
      },
      mode: {
        type: 'string',
        enum: ['row-by-row', 'full'],
        description:
          '"row-by-row" (default): compare row 1 of rangeA with row 1 of rangeB, etc. ' +
          '"full": flatten both ranges and compare cell by cell in reading order.',
      },
    },
    required: ['spreadsheetId', 'rangeA', 'rangeB'],
  },
};

function parseRangeParts(range: string): {
  sheetName: string;
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
} {
  if (!range.includes('!')) {
    throw new Error(`Range must include sheet name prefix, e.g. "Sheet1!A1:F10". Got: "${range}"`);
  }
  const bangIdx = range.indexOf('!');
  const sheetName = range.slice(0, bangIdx);
  const rangeOnly = range.slice(bangIdx + 1);

  const match = rangeOnly.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid range format: "${rangeOnly}". Expected e.g. "A1:F10".`);
  }
  return {
    sheetName,
    startCol: columnToIndex(match[1]!),
    startRow: parseInt(match[2]!) - 1,
    endCol: columnToIndex(match[3]!) + 1, // exclusive
    endRow: parseInt(match[4]!),           // exclusive
  };
}

function getFmtKey(
  rowData: sheets_v4.Schema$RowData[],
  rowOffset: number,
  colOffset: number,
  useEffectiveFormat: boolean,
  fields?: string[]
): { key: string; fmt: Record<string, unknown> } {
  const row = rowData[rowOffset];
  const cell = row?.values?.[colOffset];
  const rawFmt = useEffectiveFormat
    ? cell?.effectiveFormat
    : cell?.userEnteredFormat;
  if (!rawFmt) return { key: '{}', fmt: {} };
  const fmt = extractFormatFields(rawFmt, fields);
  return { key: JSON.stringify(fmt), fmt };
}

interface CellDiff {
  cellA: string;
  cellB: string;
  diffs: Record<string, { a: unknown; b: unknown }>;
}

function deepDiffProperties(
  fmtA: Record<string, unknown>,
  fmtB: Record<string, unknown>
): Record<string, { a: unknown; b: unknown }> {
  const allKeys = new Set([...Object.keys(fmtA), ...Object.keys(fmtB)]);
  const diffs: Record<string, { a: unknown; b: unknown }> = {};
  for (const key of allKeys) {
    const aVal = fmtA[key];
    const bVal = fmtB[key];
    if (JSON.stringify(aVal) !== JSON.stringify(bVal)) {
      diffs[key] = { a: aVal ?? null, b: bVal ?? null };
    }
  }
  return diffs;
}

export async function handleCompareRanges(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, rangeA, rangeB, fields: formatFields, useEffectiveFormat, mode } =
      inputSchema.parse(input);

    const parsedA = parseRangeParts(rangeA);
    const parsedB = parseRangeParts(rangeB);

    const numRowsA = parsedA.endRow - parsedA.startRow;
    const numColsA = parsedA.endCol - parsedA.startCol;
    const numRowsB = parsedB.endRow - parsedB.startRow;
    const numColsB = parsedB.endCol - parsedB.startCol;

    if (numColsA !== numColsB) {
      throw new Error(
        `Ranges must have the same number of columns. rangeA has ${numColsA} columns, rangeB has ${numColsB}.`
      );
    }
    if (numRowsA !== numRowsB) {
      throw new Error(
        `Ranges must have the same number of rows. rangeA has ${numRowsA} rows, rangeB has ${numRowsB}.`
      );
    }

    const formatField = useEffectiveFormat ? 'effectiveFormat' : 'userEnteredFormat';

    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [rangeA, rangeB],
      includeGridData: true,
      fields:
        'sheets.properties.title,' +
        'sheets.data.startRow,sheets.data.startColumn,' +
        `sheets.data.rowData.values.${formatField}`,
    });

    // Find grid data for each range — responses come back per-sheet, per-range
    // When both ranges are in the same sheet, they appear as two data entries in the same sheet
    // When in different sheets, they appear in different sheet entries
    const allSheets = response.data.sheets ?? [];

    function findGridData(
      parsed: ReturnType<typeof parseRangeParts>,
      rangeStr: string
    ): sheets_v4.Schema$GridData {
      for (const s of allSheets) {
        if (s.properties?.title !== parsed.sheetName) continue;
        for (const gd of s.data ?? []) {
          const gdStartRow = gd.startRow ?? 0;
          const gdStartCol = gd.startColumn ?? 0;
          if (gdStartRow === parsed.startRow && gdStartCol === parsed.startCol) return gd;
        }
      }
      throw new Error(`Could not locate grid data for range "${rangeStr}". Check the sheet name.`);
    }

    const gdA = findGridData(parsedA, rangeA);
    const gdB = findGridData(parsedB, rangeB);

    const rowDataA: sheets_v4.Schema$RowData[] = gdA.rowData ?? [];
    const rowDataB: sheets_v4.Schema$RowData[] = gdB.rowData ?? [];

    const diffs: CellDiff[] = [];
    let equalCells = 0;

    for (let r = 0; r < numRowsA; r++) {
      for (let c = 0; c < numColsA; c++) {
        const { fmt: fmtA } = getFmtKey(rowDataA, r, c, useEffectiveFormat, formatFields);
        const { fmt: fmtB } = getFmtKey(rowDataB, r, c, useEffectiveFormat, formatFields);

        const propDiffs = deepDiffProperties(fmtA, fmtB);
        if (Object.keys(propDiffs).length === 0) {
          equalCells++;
          continue;
        }
        diffs.push({
          cellA: `${colIndexToLetter(parsedA.startCol + c)}${parsedA.startRow + r + 1}`,
          cellB: `${colIndexToLetter(parsedB.startCol + c)}${parsedB.startRow + r + 1}`,
          diffs: propDiffs,
        });
      }
    }

    const totalCells = numRowsA * numColsA;
    const identical = diffs.length === 0;

    return formatSuccessResponse(
      {
        rangeA,
        rangeB,
        dimensions: { rows: numRowsA, cols: numColsA, totalCells },
        formatType: formatField,
        fieldsCompared: formatFields ?? 'all',
        identical,
        summary: identical
          ? `All ${totalCells} cells have identical formatting.`
          : `${diffs.length} of ${totalCells} cells differ. ${equalCells} cells are identical.`,
        equalCells,
        diffCount: diffs.length,
        diffs,
      },
      identical
        ? `Ranges ${rangeA} and ${rangeB} have identical formatting`
        : `Found ${diffs.length} formatting difference(s) between ${rangeA} and ${rangeB}`
    );
  } catch (error) {
    return handleError(error);
  }
}
