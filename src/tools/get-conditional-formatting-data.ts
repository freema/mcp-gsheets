import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSuccessResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { findSheetOrThrow } from '../utils/range-helpers.js';

const inputSchema = z.object({
  spreadsheetId: z.string(),
  sheetName: z.string(),
});

export const getConditionalFormattingDataTool: Tool = {
  name: 'sheets_get_conditional_formatting',
  description:
    'Read conditional formatting rules and banded ranges (alternating row/column colors) for a sheet.',
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

export async function handleGetConditionalFormattingData(input: any): Promise<ToolResponse> {
  try {
    const { spreadsheetId, sheetName } = inputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields:
        'sheets.properties.title,sheets.properties.sheetId,' +
        'sheets.conditionalFormats,' +
        'sheets.bandedRanges',
    });

    const sheetData = findSheetOrThrow(response.data.sheets ?? [], sheetName);

    return formatSuccessResponse(
      {
        sheetName,
        sheetId: sheetData.properties?.sheetId,
        conditionalFormats: sheetData.conditionalFormats ?? [],
        bandedRanges: sheetData.bandedRanges ?? [],
      },
      `Conditional formatting data for sheet "${sheetName}"`
    );
  } catch (error) {
    return handleError(error);
  }
}
