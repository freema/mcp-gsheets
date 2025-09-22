import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateInsertRowsInput } from '../utils/validators.js';
import { formatToolResponse } from '../utils/formatters.js';
import { extractSheetName, getSheetId, parseRange } from '../utils/range-helpers.js';

export const insertRowsTool: Tool = {
  name: 'sheets_insert_rows',
  description: 'Insert new rows at a specific position with optional data',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description: 'The A1 notation anchor point where rows will be inserted (e.g., "Sheet1!A5")',
      },
      rows: {
        type: 'number',
        description: 'Number of rows to insert (default: 1)',
      },
      position: {
        type: 'string',
        enum: ['BEFORE', 'AFTER'],
        description: 'Position relative to the anchor row (default: BEFORE)',
      },
      inheritFromBefore: {
        type: 'boolean',
        description: 'Whether to inherit formatting from the row before (default: false)',
      },
      values: {
        type: 'array',
        items: {
          type: 'array',
        },
        description: 'Optional 2D array of values to fill the newly inserted rows',
      },
      valueInputOption: {
        type: 'string',
        enum: ['RAW', 'USER_ENTERED'],
        description: 'How the input data should be interpreted (default: USER_ENTERED)',
      },
    },
    required: ['spreadsheetId', 'range'],
  },
};

/**
 * Convert zero-based index to column letter(s)
 * 0 = A, 1 = B, 25 = Z, 26 = AA, etc.
 */
function indexToColumn(index: number): string {
  let column = '';
  let num = index + 1;
  while (num > 0) {
    num--;
    column = String.fromCharCode((num % 26) + 'A'.charCodeAt(0)) + column;
    num = Math.floor(num / 26);
  }
  return column;
}

export async function handleInsertRows(input: any) {
  try {
    const validatedInput = validateInsertRowsInput(input);
    const sheets = await getAuthenticatedClient();

    // Extract sheet name from range
    const { sheetName, range: cellRange } = extractSheetName(validatedInput.range);

    // Get sheet ID
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);

    // Parse the range to get the anchor row
    const parsedRange = parseRange(cellRange, sheetId);
    const anchorRowIndex = parsedRange.startRowIndex ?? 0;
    const anchorColumnIndex = parsedRange.startColumnIndex ?? 0;

    // Calculate insertion indices
    const startIndex = validatedInput.position === 'AFTER' ? anchorRowIndex + 1 : anchorRowIndex;
    const endIndex = startIndex + validatedInput.rows;

    // Insert rows using batchUpdate
    const insertRequest = {
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex,
                endIndex,
              },
              inheritFromBefore: validatedInput.inheritFromBefore,
            },
          },
        ],
      },
    };

    await sheets.spreadsheets.batchUpdate(insertRequest);

    // If values are provided, update the newly inserted rows
    if (validatedInput.values && validatedInput.values.length > 0) {
      // Calculate the A1 range for the new rows
      const updateStartRow = startIndex + 1; // Convert to 1-based
      const updateEndRow = updateStartRow + validatedInput.values.length - 1;

      const startColumn = indexToColumn(anchorColumnIndex);
      const endColumn = indexToColumn(
        anchorColumnIndex + Math.max(...validatedInput.values.map((row: any[]) => row.length)) - 1
      );

      const updateRange = sheetName
        ? `'${sheetName}'!${startColumn}${updateStartRow}:${endColumn}${updateEndRow}`
        : `${startColumn}${updateStartRow}:${endColumn}${updateEndRow}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: validatedInput.spreadsheetId,
        range: updateRange,
        valueInputOption: validatedInput.valueInputOption,
        requestBody: {
          values: validatedInput.values,
        },
      });

      const cellCount = validatedInput.values.reduce(
        (sum: number, row: any[]) => sum + row.length,
        0
      );
      return formatToolResponse(
        `Inserted ${validatedInput.rows} rows ${validatedInput.position} row ${anchorRowIndex + 1} on "${sheetName || 'Sheet'}" and updated ${cellCount} cells in range: ${updateRange}`
      );
    }

    return formatToolResponse(
      `Inserted ${validatedInput.rows} rows ${validatedInput.position} row ${anchorRowIndex + 1} on "${sheetName || 'Sheet'}"`
    );
  } catch (error) {
    return handleError(error);
  }
}
