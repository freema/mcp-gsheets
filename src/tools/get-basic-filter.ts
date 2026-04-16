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

export const getBasicFilterTool: Tool = {
  name: 'sheets_get_basic_filter',
  description:
    'Read the Basic Filter (AutoFilter) configuration for a sheet, including the filtered range, ' +
    'sort specs, and per-column filter criteria (hidden values, conditions, color filters). ' +
    'Returns hasBasicFilter: false if no filter is applied.',
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

/** Convert a GridRange to a human-readable A1 range string. */
function gridRangeToA1(range: sheets_v4.Schema$GridRange): string {
  const startCol = range.startColumnIndex ?? 0;
  const startRow = (range.startRowIndex ?? 0) + 1; // 1-based
  const endCol = (range.endColumnIndex ?? startCol + 1) - 1;
  const endRow = range.endRowIndex ?? startRow; // endRowIndex is exclusive

  return `${colToLetter(startCol)}${startRow}:${colToLetter(endCol)}${endRow}`;
}

export async function handleGetBasicFilter(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.basicFilter',
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

    const bf = sheetData.basicFilter;

    if (!bf) {
      return formatSuccessResponse(
        { sheetName, hasBasicFilter: false },
        `No basic filter on sheet "${sheetName}"`
      );
    }

    // Build human-readable filter criteria from filterSpecs (preferred) or legacy criteria
    const filterCriteria: Array<{
      columnIndex: number;
      columnLetter: string;
      hiddenValues: string[];
      condition: sheets_v4.Schema$BooleanCondition | null;
      visibleBackgroundColor: sheets_v4.Schema$Color | null;
      visibleForegroundColor: sheets_v4.Schema$Color | null;
    }> = [];

    if (bf.filterSpecs && bf.filterSpecs.length > 0) {
      for (const spec of bf.filterSpecs) {
        const colIdx = spec.columnIndex ?? 0;
        const fc = spec.filterCriteria;
        filterCriteria.push({
          columnIndex: colIdx,
          columnLetter: colToLetter(colIdx),
          hiddenValues: fc?.hiddenValues ?? [],
          condition: fc?.condition ?? null,
          visibleBackgroundColor: fc?.visibleBackgroundColor ?? null,
          visibleForegroundColor: fc?.visibleForegroundColor ?? null,
        });
      }
    } else if (bf.criteria) {
      for (const [colIdx, fc] of Object.entries(bf.criteria)) {
        const idx = Number(colIdx);
        const criteria = fc as sheets_v4.Schema$FilterCriteria;
        filterCriteria.push({
          columnIndex: idx,
          columnLetter: colToLetter(idx),
          hiddenValues: criteria.hiddenValues ?? [],
          condition: criteria.condition ?? null,
          visibleBackgroundColor: criteria.visibleBackgroundColor ?? null,
          visibleForegroundColor: criteria.visibleForegroundColor ?? null,
        });
      }
    }

    const rangeA1 = bf.range ? gridRangeToA1(bf.range) : null;

    return formatSuccessResponse(
      {
        sheetName,
        hasBasicFilter: true,
        basicFilter: {
          range: rangeA1,
          sortSpecs: (bf.sortSpecs ?? []).map((s: sheets_v4.Schema$SortSpec) => ({
            columnIndex: s.dimensionIndex,
            columnLetter:
              s.dimensionIndex !== null && s.dimensionIndex !== undefined
                ? colToLetter(s.dimensionIndex)
                : null,
            sortOrder: s.sortOrder ?? null,
          })),
          filterCriteria,
        },
      },
      `Basic filter for sheet "${sheetName}" — range ${rangeA1}`
    );
  } catch (error) {
    return handleError(error);
  }
}
