import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateUpdateSheetPropertiesInput } from '../utils/validators.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';

export const updateSheetPropertiesTool: Tool = {
  name: 'sheets_update_sheet_properties',
  description: 'Update properties of a sheet in a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetId: {
        type: 'number',
        description: 'The ID of the sheet to update (use sheets_get_metadata to find sheet IDs)',
      },
      title: {
        type: 'string',
        description: 'New title for the sheet',
      },
      gridProperties: {
        type: 'object',
        properties: {
          rowCount: {
            type: 'number',
            description: 'Number of rows',
          },
          columnCount: {
            type: 'number',
            description: 'Number of columns',
          },
          frozenRowCount: {
            type: 'number',
            description: 'Number of frozen rows',
          },
          frozenColumnCount: {
            type: 'number',
            description: 'Number of frozen columns',
          },
        },
        description: 'Grid properties to update',
      },
      tabColor: {
        type: 'object',
        properties: {
          red: {
            type: 'number',
            description: 'Red component (0.0-1.0)',
          },
          green: {
            type: 'number',
            description: 'Green component (0.0-1.0)',
          },
          blue: {
            type: 'number',
            description: 'Blue component (0.0-1.0)',
          },
        },
        description: 'Tab color (RGB values from 0.0 to 1.0)',
      },
    },
    required: ['spreadsheetId', 'sheetId'],
  },
};

export async function handleUpdateSheetProperties(input: any) {
  try {
    const validatedInput = validateUpdateSheetPropertiesInput(input);
    const sheets = await getAuthenticatedClient();

    const updateRequest: any = {
      properties: {
        sheetId: validatedInput.sheetId,
      },
      fields: [],
    };

    if (validatedInput.title !== undefined) {
      updateRequest.properties.title = validatedInput.title;
      updateRequest.fields.push('title');
    }

    if (validatedInput.gridProperties) {
      updateRequest.properties.gridProperties = validatedInput.gridProperties;
      if (validatedInput.gridProperties.rowCount !== undefined) {
        updateRequest.fields.push('gridProperties.rowCount');
      }
      if (validatedInput.gridProperties.columnCount !== undefined) {
        updateRequest.fields.push('gridProperties.columnCount');
      }
      if (validatedInput.gridProperties.frozenRowCount !== undefined) {
        updateRequest.fields.push('gridProperties.frozenRowCount');
      }
      if (validatedInput.gridProperties.frozenColumnCount !== undefined) {
        updateRequest.fields.push('gridProperties.frozenColumnCount');
      }
    }

    if (validatedInput.tabColor) {
      updateRequest.properties.tabColor = validatedInput.tabColor;
      updateRequest.fields.push('tabColor');
    }

    if (updateRequest.fields.length === 0) {
      throw new Error('No properties to update');
    }

    updateRequest.fields = updateRequest.fields.join(',');

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: updateRequest,
          },
        ],
      },
    });

    return formatSheetOperationResponse('Sheet properties updated', {
      sheetId: validatedInput.sheetId,
      updatedFields: updateRequest.fields,
    });
  } catch (error) {
    return handleError(error);
  }
}
