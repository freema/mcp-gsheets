import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateCreateSpreadsheetInput } from '../utils/validators.js';
import { formatSpreadsheetCreatedResponse } from '../utils/formatters.js';

export const createSpreadsheetTool: Tool = {
  name: 'sheets_create_spreadsheet',
  description: 'Create a new Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title of the new spreadsheet'
      },
      sheets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the sheet'
            },
            rowCount: {
              type: 'number',
              description: 'Number of rows in the sheet (default: 1000)'
            },
            columnCount: {
              type: 'number',
              description: 'Number of columns in the sheet (default: 26)'
            }
          }
        },
        description: 'Array of sheets to create in the spreadsheet'
      }
    },
    required: ['title']
  }
};

export async function handleCreateSpreadsheet(input: any) {
  try {
    const validatedInput = validateCreateSpreadsheetInput(input);
    const sheets = await getAuthenticatedClient();
    
    const requestBody: any = {
      properties: {
        title: validatedInput.title
      }
    };
    
    if (validatedInput.sheets && validatedInput.sheets.length > 0) {
      requestBody.sheets = validatedInput.sheets.map((sheet, index) => ({
        properties: {
          title: sheet.title || `Sheet${index + 1}`,
          gridProperties: {
            rowCount: sheet.rowCount || 1000,
            columnCount: sheet.columnCount || 26
          }
        }
      }));
    }
    
    const response = await sheets.spreadsheets.create({
      requestBody
    });
    
    return formatSpreadsheetCreatedResponse(response.data);
  } catch (error) {
    return handleError(error);
  }
}