import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateBatchDeleteSheetsInput } from '../utils/validators.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';

export const batchDeleteSheetsTool: Tool = {
  name: 'sheets_batch_delete_sheets',
  description: 'Delete multiple sheets from a Google Sheets spreadsheet in a single operation',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetIds: {
        type: 'array',
        items: {
          type: 'number',
        },
        description: 'Array of sheet IDs to delete (use sheets_get_metadata to find sheet IDs)',
      },
    },
    required: ['spreadsheetId', 'sheetIds'],
  },
};

export async function handleBatchDeleteSheets(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = validateBatchDeleteSheetsInput(input);
    const sheets = await getAuthenticatedClient();

    // Build delete requests for each sheet
    const requests = validatedInput.sheetIds.map((sheetId) => ({
      deleteSheet: {
        sheetId: sheetId,
      },
    }));

    // Execute batch delete
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: requests,
      },
    });

    return formatToolResponse(`Successfully deleted ${validatedInput.sheetIds.length} sheets`, {
      spreadsheetId: response.data.spreadsheetId,
      deletedSheetIds: validatedInput.sheetIds,
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
