import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateDeleteRowsInput } from '../utils/validators.js';
import { formatToolResponse } from '../utils/formatters.js';
import { extractSheetName, getSheetId } from '../utils/range-helpers.js';

export const deleteRowsTool: Tool = {
  name: 'sheets_delete_rows',
  description: 'Delete one or more rows from a Google Sheet using a full-row A1 range',
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
          'Full-row A1 range to delete (e.g., "Sheet1!2:4" or "Sheet1!3:3"). If sheet name is omitted, the first sheet is used',
      },
    },
    required: ['spreadsheetId', 'range'],
  },
};

function parseRowRange(range: string): { startIndex: number; endIndex: number } {
  const match = range.match(/^(\d+):(\d+)$/);
  if (!match?.[1] || !match[2]) {
    throw new Error('Row range must use full-row A1 notation, e.g. "2:4" or "3:3"');
  }

  const startRow = parseInt(match[1], 10);
  const endRow = parseInt(match[2], 10);

  if (Number.isNaN(startRow) || Number.isNaN(endRow) || startRow <= 0 || endRow <= 0) {
    throw new Error('Row numbers must be positive integers');
  }

  if (endRow < startRow) {
    throw new Error('Row range end must be greater than or equal to the start row');
  }

  return {
    startIndex: startRow - 1,
    endIndex: endRow,
  };
}

export async function handleDeleteRows(input: any) {
  try {
    const validatedInput = validateDeleteRowsInput(input);
    const sheets = await getAuthenticatedClient();

    const { sheetName, range } = extractSheetName(validatedInput.range);
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);
    const { startIndex, endIndex } = parseRowRange(range);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex,
                endIndex,
              },
            },
          },
        ],
      },
    });

    return formatToolResponse(
      `Successfully deleted ${endIndex - startIndex} rows in range ${validatedInput.range}`,
      {
        spreadsheetId: validatedInput.spreadsheetId,
        sheetId,
        deletedRows: endIndex - startIndex,
        range: validatedInput.range,
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
