import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateDuplicateSheetInput } from '../utils/validators.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';

export const duplicateSheetTool: Tool = {
  name: 'sheets_duplicate_sheet',
  description: 'Duplicate a sheet within a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)'
      },
      sheetId: {
        type: 'number',
        description: 'The ID of the sheet to duplicate (use sheets_get_metadata to find sheet IDs)'
      },
      insertSheetIndex: {
        type: 'number',
        description: 'The index where the new sheet should be inserted (0-based)'
      },
      newSheetName: {
        type: 'string',
        description: 'The name for the duplicated sheet'
      }
    },
    required: ['spreadsheetId', 'sheetId']
  }
};

export async function handleDuplicateSheet(input: any) {
  try {
    const validatedInput = validateDuplicateSheetInput(input);
    const sheets = await getAuthenticatedClient();
    
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [{
          duplicateSheet: {
            sourceSheetId: validatedInput.sheetId,
            insertSheetIndex: validatedInput.insertSheetIndex,
            newSheetName: validatedInput.newSheetName
          }
        }]
      }
    });
    
    const duplicatedSheet = response.data.replies?.[0]?.duplicateSheet?.properties;
    return formatSheetOperationResponse('Sheet duplicated', {
      newSheetId: duplicatedSheet?.sheetId,
      title: duplicatedSheet?.title,
      index: duplicatedSheet?.index
    });
  } catch (error) {
    return handleError(error);
  }
}