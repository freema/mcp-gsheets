import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { colIndexToLetter } from '../utils/range-helpers.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
});

export const getSheetStructureTool: Tool = {
  name: 'sheets_get_sheet_structure',
  description:
    'Lightweight tool returning ONLY structural/dimensional metadata for a sheet — no per-cell data. ' +
    'Returns: sheet dimensions, frozen rows/cols, tab color, sheet index, ' +
    'column widths array, row heights array, hidden columns/rows, and all merge ranges in A1 notation. ' +
    'Use this instead of sheets_get_full_sheet_snapshot when per-cell formatting is not needed. ' +
    'Much faster and cheaper — single API call with minimal field mask.',
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

export async function handleGetSheetStructure(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields:
        'sheets.properties,' +
        'sheets.merges,' +
        'sheets.data.columnMetadata,' +
        'sheets.data.rowMetadata',
    });

    const allSheets = response.data.sheets ?? [];
    const sheetData = allSheets.find(
      (s: sheets_v4.Schema$Sheet) => s.properties?.title === sheetName
    );

    if (!sheetData) {
      const available = allSheets
        .map((s: sheets_v4.Schema$Sheet) => s.properties?.title)
        .filter(Boolean)
        .join(', ');
      throw new Error(`Sheet "${sheetName}" not found. Available: ${available}`);
    }

    const props = sheetData.properties!;
    const gridProps = props.gridProperties ?? {};
    const gridData = sheetData.data?.[0] ?? {};

    const sheetIndex = allSheets.findIndex(
      (s: sheets_v4.Schema$Sheet) => s.properties?.title === sheetName
    );

    // Column widths — just pixel sizes; track hidden columns separately
    const columnWidths = (gridData.columnMetadata ?? []).map(
      (col: sheets_v4.Schema$DimensionProperties) => col.pixelSize ?? null
    );
    const hiddenColumns = (gridData.columnMetadata ?? [])
      .map((col: sheets_v4.Schema$DimensionProperties, i: number) => (col.hiddenByUser ? i : -1))
      .filter((i: number) => i >= 0);

    // Row heights — just pixel sizes; track hidden rows separately
    const rowHeights = (gridData.rowMetadata ?? []).map(
      (row: sheets_v4.Schema$DimensionProperties) => row.pixelSize ?? null
    );
    const hiddenRows = (gridData.rowMetadata ?? [])
      .map((row: sheets_v4.Schema$DimensionProperties, i: number) => (row.hiddenByUser ? i : -1))
      .filter((i: number) => i >= 0);

    // Merges in A1 notation
    const merges = (sheetData.merges ?? []).map((m: sheets_v4.Schema$GridRange) => {
      const sc = m.startColumnIndex ?? 0;
      const ec = (m.endColumnIndex ?? 1) - 1; // endColumnIndex is exclusive
      const sr = (m.startRowIndex ?? 0) + 1;  // convert to 1-based
      const er = m.endRowIndex ?? 1;           // endRowIndex is exclusive, which is 1-based end
      return `${colIndexToLetter(sc)}${sr}:${colIndexToLetter(ec)}${er}`;
    });

    return formatSuccessResponse(
      {
        sheetName,
        sheetId: props.sheetId,
        sheetIndex,
        tabColor: props.tabColor ?? null,
        tabColorStyle: props.tabColorStyle ?? null,
        dimensions: {
          rowCount: gridProps.rowCount ?? null,
          columnCount: gridProps.columnCount ?? null,
        },
        frozen: {
          rowCount: gridProps.frozenRowCount ?? 0,
          columnCount: gridProps.frozenColumnCount ?? 0,
        },
        columnWidths,
        rowHeights,
        hiddenColumns,
        hiddenRows,
        mergeCount: merges.length,
        merges,
      },
      `Structure for sheet "${sheetName}" — ${merges.length} merges, ` +
        `${columnWidths.length} columns, ${rowHeights.length} rows`
    );
  } catch (error) {
    return handleError(error);
  }
}
