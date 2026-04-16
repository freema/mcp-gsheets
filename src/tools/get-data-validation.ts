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
  range: z.string().optional(),
});

export const getDataValidationTool: Tool = {
  name: 'sheets_get_data_validation',
  description:
    'Read data validation rules (checkboxes, dropdown lists, custom formulas, etc.) from a sheet or range. ' +
    'Returns a compact list of unique validation rules grouped by their cell ranges ' +
    '(run-length encoded). Useful for discovering checkboxes (BOOLEAN), dropdown lists ' +
    '(ONE_OF_LIST / ONE_OF_RANGE), number constraints, and custom formula validations.',
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
      range: {
        type: 'string',
        description:
          'Optional range WITHOUT sheet prefix, e.g. "A1:Z85". If omitted, the entire sheet is inspected.',
      },
    },
    required: ['spreadsheetId', 'sheetName'],
  },
};

/** Convert 0-based column index to A1 column letter(s). */
function colToLetter(col: number): string {
  let letter = '';
  let c = col;
  while (c >= 0) {
    letter = String.fromCharCode((c % 26) + 65) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
}

/** Serialize a DataValidationRule to a stable JSON key for grouping. */
function validationKey(dv: sheets_v4.Schema$DataValidationRule): string {
  return JSON.stringify({
    type: dv.condition?.type ?? null,
    values: (dv.condition?.values ?? []).map((v) => v.userEnteredValue ?? v.relativeDate ?? ''),
    strict: dv.strict ?? false,
    showCustomUi: dv.showCustomUi ?? false,
    inputMessage: dv.inputMessage ?? '',
  });
}

interface CompactRule {
  type: string | null;
  values: string[];
  strict: boolean;
  showCustomUi: boolean;
  inputMessage: string;
  ranges: string[];
}

/**
 * Group cells sharing identical validation rules into rectangular A1-ranges.
 *
 * Strategy: build a column-major bitmap per unique rule, then sweep each column
 * to find contiguous row runs. Adjacent columns with the same row span are merged.
 */
function compactifyValidation(
  rowData: sheets_v4.Schema$RowData[],
  startRow: number,
  startCol: number
): CompactRule[] {
  // Map: serialized rule → { parsed rule, set of "row,col" }
  const ruleMap = new Map<string, { rule: sheets_v4.Schema$DataValidationRule; cells: Set<string> }>();

  for (let r = 0; r < rowData.length; r++) {
    const row = rowData[r];
    if (!row?.values) continue;
    for (let c = 0; c < row.values.length; c++) {
      const dv = row.values[c]?.dataValidation;
      if (!dv) continue;
      const key = validationKey(dv);
      if (!ruleMap.has(key)) {
        ruleMap.set(key, { rule: dv, cells: new Set() });
      }
      ruleMap.get(key)!.cells.add(`${r + startRow},${c + startCol}`);
    }
  }

  const results: CompactRule[] = [];

  for (const [, { rule, cells }] of ruleMap) {
    // Determine bounding box
    const coords = [...cells].map((s) => {
      const parts = s.split(',').map(Number);
      return { r: parts[0] ?? 0, c: parts[1] ?? 0 };
    });
    const minRow = Math.min(...coords.map((p) => p.r));
    const maxRow = Math.max(...coords.map((p) => p.r));
    const minCol = Math.min(...coords.map((p) => p.c));
    const maxCol = Math.max(...coords.map((p) => p.c));

    // Build a 2D boolean grid
    const rows = maxRow - minRow + 1;
    const cols = maxCol - minCol + 1;
    const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
    for (const { r, c } of coords) {
      const gridRow = grid[r - minRow];
      if (gridRow) gridRow[c - minCol] = true;
    }

    // Greedy rectangle extraction
    const ranges: string[] = [];
    const used: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (!grid[r]?.[c] || used[r]?.[c]) continue;

        // Extend down in this column
        let endR = r;
        while (endR + 1 < rows && grid[endR + 1]?.[c] && !used[endR + 1]?.[c]) endR++;

        // Extend right while all rows in the span are filled
        let endC = c;
        outer: while (endC + 1 < cols) {
          for (let rr = r; rr <= endR; rr++) {
            if (!grid[rr]?.[endC + 1] || used[rr]?.[endC + 1]) break outer;
          }
          endC++;
        }

        // Mark used
        for (let rr = r; rr <= endR; rr++) {
          const usedRow = used[rr];
          if (usedRow) {
            for (let cc = c; cc <= endC; cc++) {
              usedRow[cc] = true;
            }
          }
        }

        const topLeft = `${colToLetter(c + minCol)}${r + minRow + 1}`;
        const bottomRight = `${colToLetter(endC + minCol)}${endR + minRow + 1}`;
        ranges.push(topLeft === bottomRight ? topLeft : `${topLeft}:${bottomRight}`);
      }
    }

    results.push({
      type: rule.condition?.type ?? null,
      values: (rule.condition?.values ?? []).map(
        (v) => v.userEnteredValue ?? v.relativeDate ?? ''
      ),
      strict: rule.strict ?? false,
      showCustomUi: rule.showCustomUi ?? false,
      inputMessage: rule.inputMessage ?? '',
      ranges,
    });
  }

  return results;
}

export async function handleGetDataValidation(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName, range } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [range ? `${sheetName}!${range}` : sheetName],
      includeGridData: true,
      fields:
        'sheets.data.rowData.values.dataValidation,' +
        'sheets.data.startRow,sheets.data.startColumn,' +
        'sheets.properties.title,sheets.properties.sheetId',
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

    const gridData = sheetData.data?.[0];
    if (!gridData?.rowData) {
      return formatSuccessResponse(
        { sheetName, validationRules: [] },
        `No data validation rules found on sheet "${sheetName}"`
      );
    }

    const startRow = gridData.startRow ?? 0;
    const startCol = gridData.startColumn ?? 0;

    const validationRules = compactifyValidation(
      gridData.rowData as sheets_v4.Schema$RowData[],
      startRow,
      startCol
    );

    return formatSuccessResponse(
      { sheetName, validationRules },
      `Data validation for sheet "${sheetName}" — ${validationRules.length} unique rule(s)`
    );
  } catch (error) {
    return handleError(error);
  }
}
