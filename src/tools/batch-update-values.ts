import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateBatchUpdateValuesInput } from '../utils/validators.js';
import { formatUpdateResponse } from '../utils/formatters.js';

export const batchUpdateValuesTool: Tool = {
  name: 'sheets_batch_update_values',
  description: 'Update values in multiple ranges of a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)'
      },
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            range: {
              type: 'string',
              description: 'The A1 notation range to update'
            },
            values: {
              type: 'array',
              items: {
                type: 'array'
              },
              description: 'A 2D array of values for this range'
            }
          },
          required: ['range', 'values']
        },
        description: 'Array of range-value pairs to update'
      },
      valueInputOption: {
        type: 'string',
        enum: ['RAW', 'USER_ENTERED'],
        description: 'How the input data should be interpreted (default: USER_ENTERED)'
      }
    },
    required: ['spreadsheetId', 'data']
  }
};

export async function handleBatchUpdateValues(input: any) {
  try {
    const validatedInput = validateBatchUpdateValuesInput(input);
    const sheets = await getAuthenticatedClient();
    
    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        valueInputOption: validatedInput.valueInputOption,
        data: validatedInput.data.map(item => ({
          range: item.range,
          values: item.values
        }))
      }
    });
    
    const totalUpdatedCells = response.data.responses?.reduce(
      (sum: number, resp: any) => sum + (resp.updatedCells || 0), 
      0
    ) || 0;
    
    return formatUpdateResponse(totalUpdatedCells);
  } catch (error) {
    return handleError(error);
  }
}