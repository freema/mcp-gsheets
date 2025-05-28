import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateCopyToInput } from '../utils/validators.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';

export const copyToTool: Tool = {
  name: 'sheets_copy_to',
  description: 'Copy a sheet to another Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the source spreadsheet (found in the URL after /d/)',
      },
      sheetId: {
        type: 'number',
        description: 'The ID of the sheet to copy (use sheets_get_metadata to find sheet IDs)',
      },
      destinationSpreadsheetId: {
        type: 'string',
        description: 'The ID of the destination spreadsheet',
      },
    },
    required: ['spreadsheetId', 'sheetId', 'destinationSpreadsheetId'],
  },
};

export async function handleCopyTo(input: any) {
  try {
    const validatedInput = validateCopyToInput(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.sheets.copyTo({
      spreadsheetId: validatedInput.spreadsheetId,
      sheetId: validatedInput.sheetId,
      requestBody: {
        destinationSpreadsheetId: validatedInput.destinationSpreadsheetId,
      },
    });

    return formatSheetOperationResponse('Sheet copied', {
      destinationSheetId: response.data.sheetId,
      title: response.data.title,
    });
  } catch (error) {
    return handleError(error);
  }
}
