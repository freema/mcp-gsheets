import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { compactifyCellFormatting } from '../utils/compact-format.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
  range: z.string(),
  useEffectiveFormat: z.boolean().optional().default(false),
  fields: z.array(z.string()).optional(),
});

export const getFormattingCompactTool: Tool = {
  name: 'sheets_get_formatting_compact',
  description:
    'Returns cell formatting for a range as compact A1Range→format pairs. ' +
    'Adjacent cells with identical formatting are collapsed into rectangular ranges ' +
    '(run-length encoded). Reduces output by 90%+ compared to per-cell formatting for typical sheets. ' +
    'Use instead of sheets_get_full_sheet_snapshot when you only need formatting data. ' +
    'Supported fields: backgroundColor, backgroundColorStyle, textFormat, horizontalAlignment, ' +
    'verticalAlignment, wrapStrategy, textRotation, numberFormat, padding, borders.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetName: {
        type: 'string',
        description: 'Name of the sheet (tab)',
      },
      range: {
        type: 'string',
        description: 'Range WITHOUT sheet prefix, e.g. "A1:Z85"',
      },
      useEffectiveFormat: {
        type: 'boolean',
        description:
          'Use effectiveFormat (true, includes all inherited defaults) or ' +
          'userEnteredFormat (false, default — only explicit overrides). ' +
          'userEnteredFormat produces much smaller output.',
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional list of format fields to include, e.g. ["backgroundColor", "textFormat", "borders"]. ' +
          'All supported fields returned if omitted.',
      },
    },
    required: ['spreadsheetId', 'sheetName', 'range'],
  },
};

export async function handleGetFormattingCompact(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName, range, useEffectiveFormat, fields } =
      inputSchema.parse(input);

    const sheets = await getAuthenticatedClient();
    const formatField = useEffectiveFormat ? 'effectiveFormat' : 'userEnteredFormat';

    // Build API-level fields mask to reduce data transfer
    let cellDataFields: string;
    if (fields && fields.length > 0) {
      cellDataFields = fields
        .map((f) => `sheets.data.rowData.values.${formatField}.${f}`)
        .join(',');
    } else {
      cellDataFields = `sheets.data.rowData.values.${formatField}`;
    }

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [`${sheetName}!${range}`],
      includeGridData: true,
      fields: `sheets.properties.title,${cellDataFields},sheets.data.startRow,sheets.data.startColumn`,
    });

    const allSheets = response.data.sheets ?? [];
    const sheetData = allSheets.find(
      (s: sheets_v4.Schema$Sheet) => s.properties?.title === sheetName
    );

    if (!sheetData) {
      const available = allSheets
        .map((s: sheets_v4.Schema$Sheet) => s.properties?.title)
        .filter(Boolean)
        .join(', ');
      throw new Error(`Sheet "${sheetName}" not found. Available: ${available}`);
    }

    const gridData = sheetData.data?.[0];
    if (!gridData?.rowData) {
      return formatSuccessResponse(
        { range: `${sheetName}!${range}`, formatType: formatField, rangeCount: 0, data: {} },
        `No formatting data found for "${sheetName}!${range}"`
      );
    }

    const startRow = gridData.startRow ?? 0;
    const startColumn = gridData.startColumn ?? 0;

    const compactData = compactifyCellFormatting(
      gridData.rowData as sheets_v4.Schema$RowData[],
      startRow,
      startColumn,
      useEffectiveFormat,
      fields
    );

    const rangeCount = Object.keys(compactData).length;
    return formatSuccessResponse(
      {
        range: `${sheetName}!${range}`,
        formatType: formatField,
        rangeCount,
        data: compactData,
      },
      `Compact formatting for "${sheetName}!${range}" — ${rangeCount} unique format ranges`
    );
  } catch (error) {
    return handleError(error);
  }
}
