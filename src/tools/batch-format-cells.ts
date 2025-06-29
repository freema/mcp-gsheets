import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateBatchFormatCellsInput } from '../utils/validators.js';
import { formatToolResponse } from '../utils/formatters.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';
import { parseJsonInput } from '../utils/json-parser.js';
import { ToolResponse } from '../types/tools.js';

export const batchFormatCellsTool: Tool = {
  name: 'sheets_batch_format_cells',
  description: 'Format multiple cell ranges in a Google Sheet in a single operation',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      formatRequests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            range: {
              type: 'string',
              description: 'Range to format in A1 notation (e.g., "Sheet1!A1:B10")',
            },
            format: {
              type: 'object',
              description: 'Cell format settings (colors, fonts, alignment, etc.)',
            },
          },
          required: ['range', 'format'],
        },
        description: 'Array of format requests, each containing a range and format object',
      },
    },
    required: ['spreadsheetId', 'formatRequests'],
  },
};

export async function handleBatchFormatCells(input: any): Promise<ToolResponse> {
  try {
    // Handle JSON strings for format objects
    if (input.formatRequests && Array.isArray(input.formatRequests)) {
      input.formatRequests = input.formatRequests.map((request: any) => ({
        ...request,
        format: parseJsonInput(request.format, 'format'),
      }));
    }

    const validatedInput = validateBatchFormatCellsInput(input);
    const sheets = await getAuthenticatedClient();

    // Build format requests
    const requests: sheets_v4.Schema$Request[] = [];

    for (const formatRequest of validatedInput.formatRequests) {
      // Extract sheet name and get sheet ID
      const { sheetName, range: cleanRange } = extractSheetName(formatRequest.range);
      const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);

      // Parse range to GridRange
      const gridRange = parseRange(cleanRange, sheetId);

      // Build the cell format
      const cellFormat: sheets_v4.Schema$CellFormat = {};

      if (formatRequest.format.backgroundColor) {
        cellFormat.backgroundColor = formatRequest.format.backgroundColor;
      }

      if (formatRequest.format.textFormat) {
        const textFormat: any = {};
        const tf = formatRequest.format.textFormat;

        if (tf.foregroundColor !== undefined) {
          textFormat.foregroundColor = tf.foregroundColor;
        }
        if (tf.fontFamily !== undefined) {
          textFormat.fontFamily = tf.fontFamily;
        }
        if (tf.fontSize !== undefined) {
          textFormat.fontSize = tf.fontSize;
        }
        if (tf.bold !== undefined) {
          textFormat.bold = tf.bold;
        }
        if (tf.italic !== undefined) {
          textFormat.italic = tf.italic;
        }
        if (tf.strikethrough !== undefined) {
          textFormat.strikethrough = tf.strikethrough;
        }
        if (tf.underline !== undefined) {
          textFormat.underline = tf.underline;
        }

        cellFormat.textFormat = textFormat;
      }

      if (formatRequest.format.horizontalAlignment) {
        cellFormat.horizontalAlignment = formatRequest.format.horizontalAlignment;
      }

      if (formatRequest.format.verticalAlignment) {
        cellFormat.verticalAlignment = formatRequest.format.verticalAlignment;
      }

      if (formatRequest.format.wrapStrategy) {
        cellFormat.wrapStrategy = formatRequest.format.wrapStrategy;
      }

      if (formatRequest.format.numberFormat) {
        cellFormat.numberFormat = {
          type: formatRequest.format.numberFormat.type,
          pattern: formatRequest.format.numberFormat.pattern ?? null,
        };
      }

      if (formatRequest.format.padding) {
        cellFormat.padding = formatRequest.format.padding;
      }

      // Add the repeat cell request
      requests.push({
        repeatCell: {
          range: gridRange,
          cell: {
            userEnteredFormat: cellFormat,
          },
          fields: 'userEnteredFormat',
        },
      });
    }

    // Execute batch format
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: requests,
      },
    });

    return formatToolResponse(
      `Successfully formatted ${validatedInput.formatRequests.length} cell ranges`,
      {
        spreadsheetId: response.data.spreadsheetId,
        formattedRanges: validatedInput.formatRequests.map((r) => r.range),
        updatedReplies: response.data.replies || [],
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
