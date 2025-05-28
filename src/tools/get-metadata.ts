import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateSpreadsheetId } from '../utils/validators.js';
import { formatSpreadsheetMetadata } from '../utils/formatters.js';

export const getMetadataTool: Tool = {
  name: 'sheets_get_metadata',
  description:
    'Get metadata about a Google Sheets spreadsheet including sheet names, IDs, and properties',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
    },
    required: ['spreadsheetId'],
  },
};

export async function handleGetMetadata(input: any) {
  try {
    if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
      throw new Error('spreadsheetId is required and must be a string');
    }

    if (!validateSpreadsheetId(input.spreadsheetId)) {
      throw new Error('Invalid spreadsheet ID format');
    }

    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId: input.spreadsheetId,
      includeGridData: false,
    });

    return formatSpreadsheetMetadata(response.data);
  } catch (error) {
    return handleError(error);
  }
}
