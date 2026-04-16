import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { gridRangeToA1, findSheetOrThrow } from '../utils/range-helpers.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
});

export const getMergedCellsTool: Tool = {
  name: 'sheets_get_merged_cells',
  description:
    'Get all merged cell ranges for a specific sheet. Returns each merge as A1 notation and GridRange coordinates.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetName: {
        type: 'string',
        description: 'Name of the sheet (tab) to inspect',
      },
    },
    required: ['spreadsheetId', 'sheetName'],
  },
};

export async function handleGetMergedCells(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.merges',
    });

    const sheetData = findSheetOrThrow(response.data.sheets ?? [], sheetName);

    const merges = (sheetData.merges ?? []).map((m: sheets_v4.Schema$GridRange) => ({
      a1Notation: gridRangeToA1(m),
      startRowIndex: m.startRowIndex,
      endRowIndex: m.endRowIndex,
      startColumnIndex: m.startColumnIndex,
      endColumnIndex: m.endColumnIndex,
    }));

    return formatSuccessResponse(
      {
        sheetName,
        sheetId: sheetData.properties?.sheetId,
        mergeCount: merges.length,
        merges,
      },
      `Found ${merges.length} merged range(s) in sheet "${sheetName}"`
    );
  } catch (error) {
    return handleError(error);
  }
}
