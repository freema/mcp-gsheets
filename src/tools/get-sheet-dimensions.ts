import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
});

export const getSheetDimensionsTool: Tool = {
  name: 'sheets_get_sheet_dimensions',
  description:
    'Get column widths (pixelSize), row heights (pixelSize), hidden columns/rows, and frozen row/column counts for a sheet.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      sheetName: {
        type: 'string',
        description: 'Name of the sheet (tab) to inspect',
      },
    },
    required: ['spreadsheetId', 'sheetName'],
  },
};

export async function handleGetSheetDimensions(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields:
        'sheets.properties,sheets.data.columnMetadata,sheets.data.rowMetadata',
    });

    const sheetData = (response.data.sheets ?? []).find(
      (s: sheets_v4.Schema$Sheet) => s.properties?.title === sheetName
    );

    if (!sheetData) {
      const available = (response.data.sheets ?? [])
        .map((s: sheets_v4.Schema$Sheet) => s.properties?.title)
        .filter(Boolean)
        .join(', ');
      throw new Error(`Sheet "${sheetName}" not found. Available: ${available}`);
    }

    const gridProps = sheetData.properties?.gridProperties ?? {};
    const gridData = sheetData.data?.[0] ?? {};

    const columns = (gridData.columnMetadata ?? []).map((col: sheets_v4.Schema$DimensionProperties, i: number) => ({
      index: i,
      pixelSize: col.pixelSize ?? null,
      hiddenByUser: col.hiddenByUser ?? false,
    }));

    const rows = (gridData.rowMetadata ?? []).map((row: sheets_v4.Schema$DimensionProperties, i: number) => ({
      index: i,
      pixelSize: row.pixelSize ?? null,
      hiddenByUser: row.hiddenByUser ?? false,
    }));

    return formatSuccessResponse(
      {
        sheetName,
        sheetId: sheetData.properties?.sheetId,
        frozenRowCount: gridProps.frozenRowCount ?? 0,
        frozenColumnCount: gridProps.frozenColumnCount ?? 0,
        totalRows: gridProps.rowCount,
        totalColumns: gridProps.columnCount,
        tabColor: sheetData.properties?.tabColor ?? null,
        columns,
        rows,
      },
      `Dimensions for sheet "${sheetName}"`
    );
  } catch (error) {
    return handleError(error);
  }
}
