import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateBatchGetValuesInput } from '../utils/validators.js';
import { formatBatchValuesResponse } from '../utils/formatters.js';

export const batchGetValuesTool: Tool = {
  name: 'sheets_batch_get_values',
  description: 'Get values from multiple ranges in a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      ranges: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'Array of A1 notation ranges to retrieve (e.g., ["Sheet1!A1:B10", "Sheet2!C1:D5"])',
      },
      majorDimension: {
        type: 'string',
        enum: ['ROWS', 'COLUMNS'],
        description: 'The major dimension of the values (default: ROWS)',
      },
      valueRenderOption: {
        type: 'string',
        enum: ['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'],
        description: 'How values should be represented (default: FORMATTED_VALUE)',
      },
    },
    required: ['spreadsheetId', 'ranges'],
  },
};

export async function handleBatchGetValues(input: any) {
  try {
    const validatedInput = validateBatchGetValuesInput(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: validatedInput.spreadsheetId,
      ranges: validatedInput.ranges,
      majorDimension: validatedInput.majorDimension,
      valueRenderOption: validatedInput.valueRenderOption,
    });

    return formatBatchValuesResponse(response.data.valueRanges || []);
  } catch (error) {
    return handleError(error);
  }
}
