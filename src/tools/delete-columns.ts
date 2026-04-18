import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateDeleteColumnsInput } from '../utils/validators.js';
import { formatToolResponse } from '../utils/formatters.js';
import { columnToIndex, extractSheetName, getSheetId } from '../utils/range-helpers.js';

export const deleteColumnsTool: Tool = {
  name: 'sheets_delete_columns',
  description: 'Delete one or more columns from a Google Sheet using a full-column A1 range',
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
          'Full-column A1 range to delete (e.g., "Sheet1!B:D" or "Sheet1!C:C"). If sheet name is omitted, the first sheet is used',
      },
    },
    required: ['spreadsheetId', 'range'],
  },
};

function parseColumnRange(range: string): { startIndex: number; endIndex: number } {
  const match = range.match(/^([A-Z]+):([A-Z]+)$/i);
  if (!match?.[1] || !match[2]) {
    throw new Error('Column range must use full-column A1 notation, e.g. "B:D" or "C:C"');
  }

  const startIndex = columnToIndex(match[1].toUpperCase());
  const endIndex = columnToIndex(match[2].toUpperCase()) + 1;

  if (endIndex <= startIndex) {
    throw new Error('Column range end must be greater than or equal to the start column');
  }

  return { startIndex, endIndex };
}

export async function handleDeleteColumns(input: any) {
  try {
    const validatedInput = validateDeleteColumnsInput(input);
    const sheets = await getAuthenticatedClient();

    const { sheetName, range } = extractSheetName(validatedInput.range);
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);
    const { startIndex, endIndex } = parseColumnRange(range);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex,
                endIndex,
              },
            },
          },
        ],
      },
    });

    return formatToolResponse(
      `Successfully deleted ${endIndex - startIndex} columns in range ${validatedInput.range}`,
      {
        spreadsheetId: validatedInput.spreadsheetId,
        sheetId,
        deletedColumns: endIndex - startIndex,
        range: validatedInput.range,
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
