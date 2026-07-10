import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { findSheetOrThrow } from '../utils/range-helpers.js';
import { formatTableForResponse } from '../utils/table-helpers.js';

const getTablesInputSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1).optional(),
});

export const getTablesTool: Tool = {
  name: 'sheets_get_tables',
  description: 'Read native Google Sheets tables for a spreadsheet or a specific sheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetName: {
        type: 'string',
        description: 'Optional name of the sheet (tab) to inspect',
      },
    },
    required: ['spreadsheetId'],
  },
};

export async function getTablesHandler(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = getTablesInputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId: validatedInput.spreadsheetId,
      fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.tables',
    });

    const spreadsheetSheets = (response.data.sheets ?? []) as sheets_v4.Schema$Sheet[];
    const targetSheets = validatedInput.sheetName
      ? [findSheetOrThrow(spreadsheetSheets, validatedInput.sheetName)]
      : spreadsheetSheets;

    const tables = targetSheets.flatMap((sheet) => {
      const sheetName = sheet.properties?.title ?? undefined;
      return (sheet.tables ?? []).map((table) => ({
        sheetName: sheetName ?? null,
        sheetId: sheet.properties?.sheetId ?? null,
        ...formatTableForResponse(table, sheetName),
      }));
    });

    const context = validatedInput.sheetName
      ? ` in sheet "${validatedInput.sheetName}"`
      : ' in spreadsheet';

    return formatSuccessResponse(
      {
        spreadsheetId: validatedInput.spreadsheetId,
        sheetName: validatedInput.sheetName,
        tableCount: tables.length,
        tables,
      },
      `Found ${tables.length} table(s)${context}`
    );
  } catch (error) {
    return handleError(error);
  }
}
