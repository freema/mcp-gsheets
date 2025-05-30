import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { MergeCellsInput, UnmergeCellsInput, ToolResponse } from '../types/tools.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';

// Schema definitions
const mergeCellsInputSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  mergeType: z.enum(['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS']),
});

const unmergeCellsInputSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
});

export const mergeCellsTool: Tool = {
  name: 'sheets_merge_cells',
  description: 'Merge cells in a Google Sheet',
  inputSchema: {
    type: 'object',
    properties: mergeCellsInputSchema.shape,
    required: ['spreadsheetId', 'range', 'mergeType'],
  },
};

export const unmergeCellsTool: Tool = {
  name: 'sheets_unmerge_cells',
  description: 'Unmerge cells in a Google Sheet',
  inputSchema: {
    type: 'object',
    properties: unmergeCellsInputSchema.shape,
    required: ['spreadsheetId', 'range'],
  },
};

export async function mergeCellsHandler(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = mergeCellsInputSchema.parse(input) as MergeCellsInput;
    const auth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(validatedInput.range);
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    // Execute the merge
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            mergeCells: {
              range: gridRange,
              mergeType: validatedInput.mergeType,
            },
          },
        ],
      },
    });

    return formatToolResponse(
      `Successfully merged cells in range ${validatedInput.range} with merge type ${validatedInput.mergeType}`,
      {
        spreadsheetId: response.data.spreadsheetId,
      }
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function unmergeCellsHandler(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = unmergeCellsInputSchema.parse(input) as UnmergeCellsInput;
    const auth = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth });

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(validatedInput.range);
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    // Execute the unmerge
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            unmergeCells: {
              range: gridRange,
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully unmerged cells in range ${validatedInput.range}`, {
      spreadsheetId: response.data.spreadsheetId,
    });
  } catch (error) {
    return handleError(error);
  }
}
