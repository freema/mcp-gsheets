import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { colIndexToLetter, columnToIndex } from '../utils/range-helpers.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string().describe('Range with sheet prefix, e.g. "Sheet1!A1:F10"'),
  includeStyle: z.boolean().optional().default(false),
});

export const getBorderMapTool: Tool = {
  name: 'sheets_get_border_map',
  description:
    'Returns a visual tabular map of borders for a range. ' +
    'Instead of per-cell JSON with 4 separate border objects, returns compact grids showing ' +
    'which cells have top/bottom/left/right borders and their styles. ' +
    'Solves the ambiguity between "right border of cell N" vs "left border of cell N+1". ' +
    'Output: a horizontal-lines grid and a vertical-lines grid, each as a 2D array of line styles. ' +
    'Set includeStyle:true to include color and width details (larger output).',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description:
          'Range with sheet prefix, e.g. "Sheet1!A1:F10". ' +
          'Sheet name is required to resolve the range correctly.',
      },
      includeStyle: {
        type: 'boolean',
        description:
          'Default: false. When true, each border line includes color and width details. ' +
          'When false, only the style name (SOLID, DASHED, etc.) is shown — more compact.',
      },
    },
    required: ['spreadsheetId', 'range'],
  },
};

/** Encode a single border into a compact string or full object */
function encodeBorder(
  border: sheets_v4.Schema$Border | null | undefined,
  includeStyle: boolean
): any {
  if (!border || border.style === 'NONE' || !border.style) return null;
  if (!includeStyle) return border.style;
  return {
    style: border.style,
    ...(border.colorStyle ? { colorStyle: border.colorStyle } : {}),
    ...(border.color ? { color: border.color } : {}),
    ...(border.width !== undefined ? { width: border.width } : {}),
  };
}

export async function handleGetBorderMap(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, range, includeStyle } = inputSchema.parse(input);

    // Parse sheet name and range
    if (!range.includes('!')) {
      throw new Error('Range must include sheet name prefix, e.g. "Sheet1!A1:F10"');
    }
    const bangIdx = range.indexOf('!');
    const sheetName = range.slice(0, bangIdx);
    const rangeOnly = range.slice(bangIdx + 1);

    // Parse range bounds
    const rangeMatch = rangeOnly.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!rangeMatch) {
      throw new Error(`Invalid range format: "${rangeOnly}". Expected e.g. "A1:F10".`);
    }
    const startCol = columnToIndex(rangeMatch[1]!);
    const startRow = parseInt(rangeMatch[2]!) - 1;
    const endCol = columnToIndex(rangeMatch[3]!) + 1; // exclusive
    const endRow = parseInt(rangeMatch[4]!);           // exclusive

    const numRows = endRow - startRow;
    const numCols = endCol - startCol;

    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [range],
      includeGridData: true,
      fields:
        'sheets.properties.title,' +
        'sheets.data.startRow,sheets.data.startColumn,' +
        'sheets.data.rowData.values.userEnteredFormat.borders',
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

    const gridData = sheetData.data?.[0] ?? {};
    const rowData: sheets_v4.Schema$RowData[] = gridData.rowData ?? [];

    // Helper: get border for a specific cell
    const getBorder = (rowOffset: number, colOffset: number): sheets_v4.Schema$Border[] => {
      // Returns [top, bottom, left, right] for cell at (rowOffset, colOffset) within range
      const row = rowData[rowOffset];
      const cell = row?.values?.[colOffset];
      const borders = cell?.userEnteredFormat?.borders;
      return [
        borders?.top ?? null,
        borders?.bottom ?? null,
        borders?.left ?? null,
        borders?.right ?? null,
      ] as any;
    };

    // ── Horizontal lines grid (numRows+1 rows × numCols cols) ──────────────────
    // horizontalLines[r][c] = border line ABOVE row r at col c
    // r=0 → top of first row, r=numRows → bottom of last row
    //
    // Rule: line between row r-1 and row r is:
    //   bottom of cell (r-1, c)  OR  top of cell (r, c)
    //   (take whichever is non-null, prefer bottom of upper cell)
    const horizontalLines: any[][] = [];
    for (let r = 0; r <= numRows; r++) {
      const row: any[] = [];
      for (let c = 0; c < numCols; c++) {
        let line: any = null;
        if (r < numRows) {
          // top border of current cell
          const [top] = getBorder(r, c);
          if (top && top.style && top.style !== 'NONE') line = encodeBorder(top, includeStyle);
        }
        if (r > 0 && line === null) {
          // bottom border of cell above
          const [, bottom] = getBorder(r - 1, c);
          if (bottom && bottom.style && bottom.style !== 'NONE')
            line = encodeBorder(bottom, includeStyle);
        }
        row.push(line);
      }
      horizontalLines.push(row);
    }

    // ── Vertical lines grid (numRows rows × numCols+1 cols) ───────────────────
    // verticalLines[r][c] = border line to the LEFT of column c at row r
    // c=0 → left of first col, c=numCols → right of last col
    const verticalLines: any[][] = [];
    for (let r = 0; r < numRows; r++) {
      const row: any[] = [];
      for (let c = 0; c <= numCols; c++) {
        let line: any = null;
        if (c < numCols) {
          // left border of current cell
          const [, , left] = getBorder(r, c);
          if (left && left.style && left.style !== 'NONE') line = encodeBorder(left, includeStyle);
        }
        if (c > 0 && line === null) {
          // right border of cell to the left
          const [, , , right] = getBorder(r, c - 1);
          if (right && right.style && right.style !== 'NONE')
            line = encodeBorder(right, includeStyle);
        }
        row.push(line);
      }
      verticalLines.push(row);
    }

    // ── Column / row headers ───────────────────────────────────────────────────
    const colHeaders = Array.from({ length: numCols }, (_, i) => colIndexToLetter(startCol + i));
    const rowHeaders = Array.from({ length: numRows }, (_, i) => String(startRow + i + 1));

    return formatSuccessResponse(
      {
        range,
        sheetName,
        dimensions: { rows: numRows, cols: numCols },
        colHeaders,
        rowHeaders,
        // horizontalLines: (numRows+1) × numCols — line above each cell row
        horizontalLines: {
          description:
            'horizontalLines[r][c] = style of horizontal border line above row r at column c. ' +
            'r=0 → top edge, r=numRows → bottom edge.',
          rowCount: numRows + 1,
          colCount: numCols,
          data: horizontalLines,
        },
        // verticalLines: numRows × (numCols+1) — line left of each cell column
        verticalLines: {
          description:
            'verticalLines[r][c] = style of vertical border line left of column c at row r. ' +
            'c=0 → left edge, c=numCols → right edge.',
          rowCount: numRows,
          colCount: numCols + 1,
          data: verticalLines,
        },
      },
      `Border map for ${range} (${numRows}×${numCols} cells)`
    );
  } catch (error) {
    return handleError(error);
  }
}
