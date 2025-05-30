import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateUpdateValuesInput } from '../utils/validators.js';
import { formatUpdateResponse } from '../utils/formatters.js';

export const updateValuesTool: Tool = {
  name: 'sheets_update_values',
  description:
    'Update values in a specified range of a Google Sheets spreadsheet. IMPORTANT: When using an exact range (e.g., "A1:F50"), the number of rows in your data must match exactly. For flexible ranges that auto-expand, use just the starting cell (e.g., "A1").',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description:
          'The A1 notation range to update. Use "Sheet1!A1:B10" for exact range (must match row count exactly) or "Sheet1!A1" for flexible range that auto-expands based on data.',
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

    // Validate range vs values count
    validateRangeRowCount(validatedInput.range, validatedInput.values);

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

/**
 * Validates that the number of rows in values matches the range specification
 */
function validateRangeRowCount(range: string, values: any[][]): void {
  // Extract the range without sheet name
  const rangePattern = /([A-Z]+)(\d+):([A-Z]+)(\d+)$/;
  const match = range.match(rangePattern);

  if (!match?.[2] || !match[4]) {
    // No end range specified (e.g., "A1" or "Sheet1!A1") - this is flexible and OK
    return;
  }

  const startRow = parseInt(match[2], 10);
  const endRow = parseInt(match[4], 10);
  const expectedRows = endRow - startRow + 1;
  const actualRows = values.length;

  if (expectedRows !== actualRows) {
    throw new Error(
      `Range mismatch: The range "${range}" expects exactly ${expectedRows} rows, ` +
        `but you provided ${actualRows} rows. ` +
        `To fix this, either:\n` +
        `1. Provide exactly ${expectedRows} rows of data\n` +
        `2. Use a flexible range (e.g., "${range.split(':')[0]}") to auto-expand based on your data`
    );
  }
}
