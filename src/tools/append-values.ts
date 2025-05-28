import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateAppendValuesInput } from '../utils/validators.js';
import { formatAppendResponse } from '../utils/formatters.js';

export const appendValuesTool: Tool = {
  name: 'sheets_append_values',
  description: 'Append values to the end of a table in a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description: 'The A1 notation range of the table to append to (e.g., "Sheet1!A:B")',
      },
      values: {
        type: 'array',
        items: {
          type: 'array',
        },
        description: 'A 2D array of values to append, where each inner array represents a row',
      },
      valueInputOption: {
        type: 'string',
        enum: ['RAW', 'USER_ENTERED'],
        description: 'How the input data should be interpreted (default: USER_ENTERED)',
      },
      insertDataOption: {
        type: 'string',
        enum: ['OVERWRITE', 'INSERT_ROWS'],
        description: 'How the input data should be inserted (default: OVERWRITE)',
      },
    },
    required: ['spreadsheetId', 'range', 'values'],
  },
};

export async function handleAppendValues(input: any) {
  try {
    const validatedInput = validateAppendValuesInput(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: validatedInput.spreadsheetId,
      range: validatedInput.range,
      valueInputOption: validatedInput.valueInputOption,
      insertDataOption: validatedInput.insertDataOption,
      requestBody: {
        values: validatedInput.values,
      },
    });

    return formatAppendResponse(response.data.updates || {});
  } catch (error) {
    return handleError(error);
  }
}
