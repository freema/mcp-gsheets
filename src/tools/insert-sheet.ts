import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateInsertSheetInput } from '../utils/validators.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';

export const insertSheetTool: Tool = {
  name: 'sheets_insert_sheet',
  description: 'Add a new sheet to an existing Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)'
      },
      title: {
        type: 'string',
        description: 'The title of the new sheet'
      },
      index: {
        type: 'number',
        description: 'The index where the sheet should be inserted (0-based)'
      },
      rowCount: {
        type: 'number',
        description: 'Number of rows in the sheet (default: 1000)'
      },
      columnCount: {
        type: 'number',
        description: 'Number of columns in the sheet (default: 26)'
      }
    },
    required: ['spreadsheetId', 'title']
  }
};

export async function handleInsertSheet(input: any) {
  try {
    const validatedInput = validateInsertSheetInput(input);
    const sheets = await getAuthenticatedClient();
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: validatedInput.title,
              index: validatedInput.index,
              gridProperties: {
                rowCount: validatedInput.rowCount,
                columnCount: validatedInput.columnCount
              }
            }
          }
        }]
      }
    });
    
    const addedSheet = response.data.replies?.[0]?.addSheet?.properties;
    return formatSheetOperationResponse('Sheet inserted', {
      sheetId: addedSheet?.sheetId,
      title: addedSheet?.title,
      index: addedSheet?.index
    });
  } catch (error) {
    return handleError(error);
  }
}