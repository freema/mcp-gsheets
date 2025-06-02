import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { FormatCellsInput, ToolResponse } from '../types/tools.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';
import { parseJsonInput } from '../utils/json-parser.js';

// Schema definitions
const colorSchema = z
  .object({
    red: z.number().min(0).max(1).optional(),
    green: z.number().min(0).max(1).optional(),
    blue: z.number().min(0).max(1).optional(),
    alpha: z.number().min(0).max(1).optional(),
  })
  .optional();

const textFormatSchema = z
  .object({
    foregroundColor: colorSchema,
    fontFamily: z.string().optional(),
    fontSize: z.number().positive().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    underline: z.boolean().optional(),
  })
  .optional();

const numberFormatSchema = z
  .object({
    type: z.enum([
      'TEXT',
      'NUMBER',
      'PERCENT',
      'CURRENCY',
      'DATE',
      'TIME',
      'DATE_TIME',
      'SCIENTIFIC',
    ]),
    pattern: z.string().optional(),
  })
  .optional();

const cellFormatSchema = z.object({
  backgroundColor: colorSchema,
  textFormat: textFormatSchema,
  horizontalAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional(),
  verticalAlignment: z.enum(['TOP', 'MIDDLE', 'BOTTOM']).optional(),
  wrapStrategy: z.enum(['OVERFLOW_CELL', 'LEGACY_WRAP', 'CLIP', 'WRAP']).optional(),
  numberFormat: numberFormatSchema,
  padding: z
    .object({
      top: z.number().optional(),
      right: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
    })
    .optional(),
});

const formatCellsInputSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  format: cellFormatSchema,
});

export const formatCellsTool: Tool = {
  name: 'sheets_format_cells',
  description: 'Format cells in a Google Sheet (colors, fonts, alignment, number formats)',
  inputSchema: {
    type: 'object',
    properties: formatCellsInputSchema.shape,
    required: ['spreadsheetId', 'range', 'format'],
  },
};

export async function formatCellsHandler(input: any): Promise<ToolResponse> {
  try {
    // Handle case where format comes as JSON string (from Claude Desktop)
    input.format = parseJsonInput(input.format, 'format');

    const validatedInput = formatCellsInputSchema.parse(input) as FormatCellsInput;
    const sheets = await getAuthenticatedClient();

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(validatedInput.range);
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    // Build the cell format
    const cellFormat: sheets_v4.Schema$CellFormat = {};

    if (validatedInput.format.backgroundColor) {
      cellFormat.backgroundColor = validatedInput.format.backgroundColor;
    }

    if (validatedInput.format.textFormat) {
      const textFormat: any = {};
      if (validatedInput.format.textFormat.foregroundColor !== undefined) {
        textFormat.foregroundColor = validatedInput.format.textFormat.foregroundColor;
      }
      if (validatedInput.format.textFormat.fontFamily !== undefined) {
        textFormat.fontFamily = validatedInput.format.textFormat.fontFamily;
      }
      if (validatedInput.format.textFormat.fontSize !== undefined) {
        textFormat.fontSize = validatedInput.format.textFormat.fontSize;
      }
      if (validatedInput.format.textFormat.bold !== undefined) {
        textFormat.bold = validatedInput.format.textFormat.bold;
      }
      if (validatedInput.format.textFormat.italic !== undefined) {
        textFormat.italic = validatedInput.format.textFormat.italic;
      }
      if (validatedInput.format.textFormat.strikethrough !== undefined) {
        textFormat.strikethrough = validatedInput.format.textFormat.strikethrough;
      }
      if (validatedInput.format.textFormat.underline !== undefined) {
        textFormat.underline = validatedInput.format.textFormat.underline;
      }
      cellFormat.textFormat = textFormat;
    }

    if (validatedInput.format.horizontalAlignment) {
      cellFormat.horizontalAlignment = validatedInput.format.horizontalAlignment;
    }

    if (validatedInput.format.verticalAlignment) {
      cellFormat.verticalAlignment = validatedInput.format.verticalAlignment;
    }

    if (validatedInput.format.wrapStrategy) {
      cellFormat.wrapStrategy = validatedInput.format.wrapStrategy;
    }

    if (validatedInput.format.numberFormat) {
      cellFormat.numberFormat = {
        type: validatedInput.format.numberFormat.type,
        pattern: validatedInput.format.numberFormat.pattern ?? null,
      };
    }

    if (validatedInput.format.padding) {
      cellFormat.padding = validatedInput.format.padding;
    }

    // Execute the format update
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: gridRange,
              cell: {
                userEnteredFormat: cellFormat,
              },
              fields: 'userEnteredFormat',
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully formatted cells in range ${validatedInput.range}`, {
      spreadsheetId: response.data.spreadsheetId,
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
