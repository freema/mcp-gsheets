import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateUpdateValuesInput } from '../utils/validators.js';
import { formatUpdateResponse } from '../utils/formatters.js';

export const updateValuesTool: Tool = {
  name: 'sheets_update_values',
  description: 'Update values in a specified range of a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description: 'The A1 notation range to update (e.g., "Sheet1!A1:B10")',
      },
      values: {
        type: 'array',
        items: {
          type: 'array',
        },
        description: 'A 2D array of values to update, where each inner array represents a row',
      },
      valueInputOption: {
        type: 'string',
        enum: ['RAW', 'USER_ENTERED'],
        description: 'How the input data should be interpreted (default: USER_ENTERED)',
      },
    },
    required: ['spreadsheetId', 'range', 'values'],
  },
};

export async function handleUpdateValues(input: any) {
  try {
    const validatedInput = validateUpdateValuesInput(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: validatedInput.spreadsheetId,
      range: validatedInput.range,
      valueInputOption: validatedInput.valueInputOption,
      requestBody: {
        values: validatedInput.values,
      },
    });

    return formatUpdateResponse(response.data.updatedCells || 0, response.data.updatedRange);
  } catch (error) {
    return handleError(error);
  }
}
