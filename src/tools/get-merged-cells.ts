import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';

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

/** Convert 0-based column index to A1 letter(s): 0→A, 25→Z, 26→AA */
function colIndexToLetter(index: number): string {
  let result = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/** Convert GridRange to A1 notation string, e.g. "A1:C3" */
function gridRangeToA1(
  startRowIndex: number,
  endRowIndex: number,
  startColumnIndex: number,
  endColumnIndex: number
): string {
  const startCol = colIndexToLetter(startColumnIndex);
  const endCol = colIndexToLetter(endColumnIndex - 1);
  const startRow = startRowIndex + 1;
  const endRow = endRowIndex; // endRowIndex is exclusive
  return `${startCol}${startRow}:${endCol}${endRow}`;
}

export async function handleGetMergedCells(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.merges',
    });

    const sheetData = (response.data.sheets ?? []).find(
      (s: sheets_v4.Schema$Sheet) => s.properties?.title === sheetName
    );

    if (!sheetData) {
      const available = (response.data.sheets ?? [])
        .map((s: sheets_v4.Schema$Sheet) => s.properties?.title)
        .filter(Boolean)
        .join(', ');
      throw new Error(`Sheet "${sheetName}" not found. Available: ${available}`);
    }

    const merges = (sheetData.merges ?? []).map((m: sheets_v4.Schema$GridRange) => ({
      a1Notation: gridRangeToA1(
        m.startRowIndex ?? 0,
        m.endRowIndex ?? 0,
        m.startColumnIndex ?? 0,
        m.endColumnIndex ?? 0
      ),
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
