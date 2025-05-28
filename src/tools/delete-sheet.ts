import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateDeleteSheetInput } from '../utils/validators.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';

export const deleteSheetTool: Tool = {
  name: 'sheets_delete_sheet',
  description: 'Delete a sheet from a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetId: {
        type: 'number',
        description: 'The ID of the sheet to delete (use sheets_get_metadata to find sheet IDs)',
      },
    },
    required: ['spreadsheetId', 'sheetId'],
  },
};

export async function handleDeleteSheet(input: any) {
  try {
    const validatedInput = validateDeleteSheetInput(input);
    const sheets = await getAuthenticatedClient();

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteSheet: {
              sheetId: validatedInput.sheetId,
            },
          },
        ],
      },
    });

    return formatSheetOperationResponse('Sheet deleted', {
      sheetId: validatedInput.sheetId,
    });
  } catch (error) {
    return handleError(error);
  }
}
