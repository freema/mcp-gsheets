import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { normalizeConditionalFormatFormulas } from '../utils/formula-locale.js';
import { findSheetOrThrow } from '../utils/range-helpers.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
  normalizeFormulas: z.boolean().optional().default(true),
});

export const getConditionalFormattingDataTool: Tool = {
  name: 'sheets_get_conditional_formatting',
  description:
    'Read conditional formatting rules and banded ranges (alternating row/column colors) for a sheet. ' +
    'CF formulas are normalized to English locale (semicolons → commas) by default. ' +
    'Each rule with a formula includes a "_formulaLocaleRaw" field with the original unmodified formula. ' +
    'Set normalizeFormulas:false to get raw formulas as returned by the API.',
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
      normalizeFormulas: {
        type: 'boolean',
        description:
          'Default: true. Normalize formula separators to English locale (semicolons → commas). ' +
          'Each normalized rule includes "_formulaLocaleRaw" with the original formula. ' +
          'Set to false to get formulas exactly as returned by the Google Sheets API.',
      },
    },
    required: ['spreadsheetId', 'sheetName'],
  },
};

export async function handleGetConditionalFormattingData(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName, normalizeFormulas } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields:
        'sheets.properties.title,sheets.properties.sheetId,' +
        'sheets.conditionalFormats,' +
        'sheets.bandedRanges',
    });

    const sheetData = findSheetOrThrow(response.data.sheets ?? [], sheetName);

    const rawFormats: any[] = sheetData.conditionalFormats ?? [];
    const conditionalFormats = normalizeFormulas
      ? rawFormats.map(normalizeConditionalFormatFormulas)
      : rawFormats;

    return formatSuccessResponse(
      {
        sheetName,
        sheetId: sheetData.properties?.sheetId,
        formulasNormalized: normalizeFormulas,
        conditionalFormats,
        bandedRanges: sheetData.bandedRanges ?? [],
      },
      `Conditional formatting data for sheet "${sheetName}"`
    );
  } catch (error) {
    return handleError(error);
  }
}
