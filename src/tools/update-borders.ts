import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { UpdateBordersInput, ToolResponse } from '../types/tools.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';

// Schema definitions
const colorSchema = z
  .object({
    red: z.number().min(0).max(1).optional(),
    green: z.number().min(0).max(1).optional(),
    blue: z.number().min(0).max(1).optional(),
    alpha: z.number().min(0).max(1).optional(),
  })
  .optional();

const borderSchema = z
  .object({
    style: z.enum(['NONE', 'SOLID', 'DASHED', 'DOTTED', 'SOLID_MEDIUM', 'SOLID_THICK', 'DOUBLE']),
    color: colorSchema,
    width: z.number().positive().optional(),
  })
  .optional();

const bordersSchema = z.object({
  top: borderSchema,
  bottom: borderSchema,
  left: borderSchema,
  right: borderSchema,
  innerHorizontal: borderSchema,
  innerVertical: borderSchema,
});

const updateBordersInputSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  borders: bordersSchema,
});

export const updateBordersTool: Tool = {
  name: 'sheets_update_borders',
  description: 'Update borders of cells in a Google Sheet',
  inputSchema: {
    type: 'object',
    properties: updateBordersInputSchema.shape,
    required: ['spreadsheetId', 'range', 'borders'],
  },
};

export async function updateBordersHandler(input: any): Promise<ToolResponse> {
  try {
    // Handle case where borders comes as JSON string
    if (input && typeof input.borders === 'string') {
      try {
        input.borders = JSON.parse(input.borders);
      } catch (parseError) {
        throw new Error('Invalid borders: Expected object or valid JSON string');
      }
    }

    const validatedInput = updateBordersInputSchema.parse(input) as UpdateBordersInput;
    const sheets = await getAuthenticatedClient();

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(validatedInput.range);
    const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    // Build the border update request
    const updateBordersRequest: sheets_v4.Schema$UpdateBordersRequest = {
      range: gridRange,
    };

    // Helper function to convert our border format to Google's format
    const convertBorder = (border?: any): sheets_v4.Schema$Border | undefined => {
      if (!border) {
        return undefined;
      }
      return {
        style: border.style,
        color: border.color,
        width: border.width,
      };
    };

    const topBorder = convertBorder(validatedInput.borders.top);
    if (topBorder) {
      updateBordersRequest.top = topBorder;
    }

    const bottomBorder = convertBorder(validatedInput.borders.bottom);
    if (bottomBorder) {
      updateBordersRequest.bottom = bottomBorder;
    }

    const leftBorder = convertBorder(validatedInput.borders.left);
    if (leftBorder) {
      updateBordersRequest.left = leftBorder;
    }

    const rightBorder = convertBorder(validatedInput.borders.right);
    if (rightBorder) {
      updateBordersRequest.right = rightBorder;
    }

    const innerHorizontalBorder = convertBorder(validatedInput.borders.innerHorizontal);
    if (innerHorizontalBorder) {
      updateBordersRequest.innerHorizontal = innerHorizontalBorder;
    }

    const innerVerticalBorder = convertBorder(validatedInput.borders.innerVertical);
    if (innerVerticalBorder) {
      updateBordersRequest.innerVertical = innerVerticalBorder;
    }

    // Execute the border update
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            updateBorders: updateBordersRequest,
          },
        ],
      },
    });

    return formatToolResponse(`Successfully updated borders for range ${validatedInput.range}`, {
      spreadsheetId: response.data.spreadsheetId,
    });
  } catch (error) {
    return handleError(error);
  }
}
