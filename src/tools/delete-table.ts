import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';

const deleteTableInputSchema = z.object({
  spreadsheetId: z.string().min(1),
  tableId: z.string().min(1),
});

export const deleteTableTool: Tool = {
  name: 'sheets_delete_table',
  description: 'Delete a native Google Sheets table by tableId',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      tableId: {
        type: 'string',
        description: 'The ID of the table to delete',
      },
    },
    required: ['spreadsheetId', 'tableId'],
  },
};

export async function deleteTableHandler(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = deleteTableInputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: validatedInput.spreadsheetId,
      fields: 'sheets.tables.tableId',
    });
    const tableExists = ((metadataResponse.data.sheets ?? []) as sheets_v4.Schema$Sheet[])
      .flatMap((sheet) => sheet.tables ?? [])
      .some((table) => table.tableId === validatedInput.tableId);

    if (!tableExists) {
      throw new Error(`Table "${validatedInput.tableId}" not found`);
    }

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteTable: {
              tableId: validatedInput.tableId,
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully deleted table "${validatedInput.tableId}"`, {
      spreadsheetId: response.data.spreadsheetId,
      tableId: validatedInput.tableId,
    });
  } catch (error) {
    return handleError(error);
  }
}
