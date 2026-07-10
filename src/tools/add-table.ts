import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { getSheetId, parseRange, findSheetOrThrow } from '../utils/range-helpers.js';
import {
  TABLE_COLUMN_TYPES,
  buildTableColumnProperties,
  ensureNoOverlappingTable,
  formatTableForResponse,
  resolveTableRangeInput,
  validateColumnCount,
  validateTableGridRange,
} from '../utils/table-helpers.js';

const columnSchema = z.object({
  name: z.string().min(1),
  columnType: z.enum(TABLE_COLUMN_TYPES),
  dropdownValues: z.array(z.string()).optional(),
});

const addTableInputSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1),
  range: z.string().min(1),
  name: z.string().min(1),
  columns: z.array(columnSchema).min(1),
});

export const addTableTool: Tool = {
  name: 'sheets_add_table',
  description:
    'Create a native Google Sheets table with typed columns and optional dropdown values',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetName: {
        type: 'string',
        description: 'Name of the sheet (tab) where the table will be created',
      },
      range: {
        type: 'string',
        description: 'A1 notation range for the table, e.g. "A1:D20" or "Sheet1!A1:D20"',
      },
      name: {
        type: 'string',
        description: 'Unique table name within the spreadsheet',
      },
      columns: {
        type: 'array',
        description: 'Column definitions for the table',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Column name' },
            columnType: {
              type: 'string',
              enum: [...TABLE_COLUMN_TYPES],
              description: 'Google Sheets table column type',
            },
            dropdownValues: {
              type: 'array',
              items: { type: 'string' },
              description: 'Allowed values for DROPDOWN columns',
            },
          },
          required: ['name', 'columnType'],
        },
      },
    },
    required: ['spreadsheetId', 'sheetName', 'range', 'name', 'columns'],
  },
};

export async function addTableHandler(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = addTableInputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const { sheetName, range } = resolveTableRangeInput(
      validatedInput.sheetName,
      validatedInput.range
    );
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);
    const gridRange = parseRange(range, sheetId);

    validateTableGridRange(gridRange, `${sheetName}!${range}`);
    validateColumnCount(gridRange, validatedInput.columns, `${sheetName}!${range}`);

    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: validatedInput.spreadsheetId,
      fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.tables',
    });
    const sheetData = findSheetOrThrow(metadataResponse.data.sheets ?? [], sheetName);
    ensureNoOverlappingTable(sheetData.tables ?? [], gridRange, sheetName);

    const table: sheets_v4.Schema$Table = {
      name: validatedInput.name,
      range: gridRange,
      columnProperties: buildTableColumnProperties(validatedInput.columns),
    };

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            addTable: {
              table,
            },
          },
        ],
      },
    });

    const addedTable = response.data.replies?.[0]?.addTable?.table ?? table;

    return formatToolResponse(`Successfully created table "${validatedInput.name}"`, {
      spreadsheetId: response.data.spreadsheetId,
      table: formatTableForResponse(addedTable, sheetName),
    });
  } catch (error) {
    return handleError(error);
  }
}
