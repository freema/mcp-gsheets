import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import {
  extractSheetName,
  findSheetOrThrow,
  getSheetId,
  parseRange,
} from '../utils/range-helpers.js';
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

const updateTableInputSchema = z
  .object({
    spreadsheetId: z.string().min(1),
    tableId: z.string().min(1),
    fields: z.string().min(1),
    sheetName: z.string().min(1).optional(),
    range: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    columns: z.array(columnSchema).min(1).optional(),
  })
  .refine((value) => value.name || value.range || value.columns, {
    message: 'At least one of name, range, or columns must be provided',
  });

export const updateTableTool: Tool = {
  name: 'sheets_update_table',
  description: 'Update an existing native Google Sheets table by tableId',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      tableId: {
        type: 'string',
        description: 'The ID of the table to update',
      },
      fields: {
        type: 'string',
        description:
          'Required field mask for the table update, e.g. "name", "range", "columnProperties", or "name,range"',
      },
      sheetName: {
        type: 'string',
        description: 'Name of the target sheet when updating the table range',
      },
      range: {
        type: 'string',
        description: 'Optional new A1 notation range for the table, e.g. "A1:D20"',
      },
      name: {
        type: 'string',
        description: 'Optional new table name',
      },
      columns: {
        type: 'array',
        description: 'Optional replacement column definitions for the table',
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
    required: ['spreadsheetId', 'tableId', 'fields'],
  },
};

export async function updateTableHandler(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = updateTableInputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: validatedInput.spreadsheetId,
      fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.tables',
    });
    const allSheets = (metadataResponse.data.sheets ?? []) as sheets_v4.Schema$Sheet[];
    const existingTable = allSheets
      .flatMap((sheet) => sheet.tables ?? [])
      .find((table) => table.tableId === validatedInput.tableId);

    if (!existingTable) {
      throw new Error(`Table "${validatedInput.tableId}" not found`);
    }

    const table: sheets_v4.Schema$Table = {
      tableId: validatedInput.tableId,
    };

    if (validatedInput.name) {
      table.name = validatedInput.name;
    }

    if (validatedInput.columns) {
      table.columnProperties = buildTableColumnProperties(validatedInput.columns);
    }

    let responseSheetName: string | undefined;

    if (validatedInput.range) {
      const extracted = extractSheetName(validatedInput.range);
      const sheetName = validatedInput.sheetName ?? extracted.sheetName;

      if (!sheetName) {
        throw new Error('sheetName is required when updating a table range');
      }

      const resolvedRange = resolveTableRangeInput(sheetName, validatedInput.range);
      responseSheetName = resolvedRange.sheetName;

      const sheetId = await getSheetId(
        sheets,
        validatedInput.spreadsheetId,
        resolvedRange.sheetName
      );
      const gridRange = parseRange(resolvedRange.range, sheetId);

      validateTableGridRange(gridRange, `${resolvedRange.sheetName}!${resolvedRange.range}`);

      if (validatedInput.columns) {
        validateColumnCount(
          gridRange,
          validatedInput.columns,
          `${resolvedRange.sheetName}!${resolvedRange.range}`
        );
      }

      const sheetData = findSheetOrThrow(allSheets, resolvedRange.sheetName);
      ensureNoOverlappingTable(
        sheetData.tables ?? [],
        gridRange,
        resolvedRange.sheetName,
        validatedInput.tableId
      );

      table.range = gridRange;
    }

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            updateTable: {
              table,
              fields: validatedInput.fields,
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully updated table "${validatedInput.tableId}"`, {
      spreadsheetId: response.data.spreadsheetId,
      table: formatTableForResponse({ ...existingTable, ...table }, responseSheetName),
      fields: validatedInput.fields,
    });
  } catch (error) {
    return handleError(error);
  }
}
