import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { extractSheetName } from '../utils/range-helpers.js';
import { ToolResponse } from '../types/tools.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  useEffectiveFormat: z.boolean().optional().default(false),
});

export const getSheetFormattingTool: Tool = {
  name: 'sheets_get_sheet_formatting',
  description:
    'Read cell formatting (background color, text color, font family, font size, bold, italic, ' +
    'horizontal/vertical alignment, wrapStrategy, textRotation, numberFormat) for a range. ' +
    'Returns a 2D array matching the requested range rows/columns. ' +
    'Set useEffectiveFormat=true to get the resolved/inherited format instead of the user-entered one.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description: 'Range in A1 notation, MUST include sheet name, e.g. "Dyspozycje!A1:Z85"',
      },
      useEffectiveFormat: {
        type: 'boolean',
        description:
          'If true, returns effectiveFormat (includes inherited/default styles). Default: false (userEnteredFormat only).',
      },
    },
    required: ['spreadsheetId', 'range'],
  },
};

export async function handleGetSheetFormatting(input: any): Promise<ToolResponse> {
  try {
    const validated = inputSchema.parse(input);
    const { spreadsheetId, range, useEffectiveFormat } = validated;

    const formatField = useEffectiveFormat ? 'effectiveFormat' : 'userEnteredFormat';
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [range],
      includeGridData: true,
      fields: `sheets.data.rowData.values.${formatField},sheets.data.startRow,sheets.data.startColumn`,
    });

    const gridData = response.data.sheets?.[0]?.data?.[0];
    if (!gridData) {
      return formatSuccessResponse({ range, cells: [] }, 'No formatting data found');
    }

    const startRow = gridData.startRow ?? 0;
    const startColumn = gridData.startColumn ?? 0;

    const cells = (gridData.rowData ?? []).map((row: sheets_v4.Schema$RowData, rowOffset: number) => {
      return (row.values ?? []).map((cell: sheets_v4.Schema$CellData, colOffset: number) => {
        const fmt = useEffectiveFormat ? cell.effectiveFormat : cell.userEnteredFormat;
        if (!fmt) return null;
        return {
          row: startRow + rowOffset,
          col: startColumn + colOffset,
          backgroundColor: fmt.backgroundColor ?? null,
          textFormat: fmt.textFormat ?? null,
          horizontalAlignment: fmt.horizontalAlignment ?? null,
          verticalAlignment: fmt.verticalAlignment ?? null,
          wrapStrategy: fmt.wrapStrategy ?? null,
          textRotation: fmt.textRotation ?? null,
          numberFormat: fmt.numberFormat ?? null,
          padding: fmt.padding ?? null,
          borders: fmt.borders ?? null,
        };
      });
    });

    const { sheetName } = extractSheetName(range);

    return formatSuccessResponse(
      {
        range,
        sheetName: sheetName ?? null,
        formatType: formatField,
        rowCount: cells.length,
        columnCount: cells[0]?.length ?? 0,
        cells,
      },
      `Formatting data for range "${range}"`
    );
  } catch (error) {
    return handleError(error);
  }
}
