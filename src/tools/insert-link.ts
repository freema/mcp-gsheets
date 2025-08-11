import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';

const insertLinkInputSchema = z.object({
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
  range: z.string().min(1, 'Range is required'),
  url: z.string().url('Invalid URL format'),
  text: z.string().optional(),
  validation: z.boolean().default(true),
  useEUFormat: z.boolean().default(true),
});

export type InsertLinkInput = z.infer<typeof insertLinkInputSchema>;

export const insertLinkTool: Tool = {
  name: 'sheets_insert_link',
  description: 'Insert clickable links in Google Sheets cells with custom display text',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description: 'The A1 notation range to insert the link (e.g., "Sheet1!A1" or "A1:B2")',
      },
      url: {
        type: 'string',
        description: 'The URL to link to (must be a valid URL)',
      },
      text: {
        type: 'string',
        description:
          'Custom display text for the link (optional - if not provided, the URL will be displayed)',
      },
      validation: {
        type: 'boolean',
        description: 'Whether to validate the URL format (default: true)',
        default: true,
      },
      useEUFormat: {
        type: 'boolean',
        description:
          'Use semicolon separator for EU locale sheets (auto-detected from user language/context if not specified)',
        default: true,
      },
    },
    required: ['spreadsheetId', 'range', 'url'],
  },
};

export async function handleInsertLink(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = insertLinkInputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    // Create the display text (use custom text if provided, otherwise use the URL)
    const displayText = validatedInput.text || validatedInput.url;

    // Use semicolon for EU format, comma for US format
    const separator = validatedInput.useEUFormat ? ';' : ',';

    // HYPERLINK is the same in both formats, just separator changes
    const hyperlinkFormula = `=HYPERLINK("${validatedInput.url}"${separator}"${displayText}")`;

    // Update the cell with the HYPERLINK formula
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: validatedInput.spreadsheetId,
      range: validatedInput.range,
      valueInputOption: 'USER_ENTERED', // This allows formulas to be processed
      requestBody: {
        values: [[hyperlinkFormula]],
      },
    });

    return formatToolResponse(`Successfully inserted link in range ${validatedInput.range}`, {
      spreadsheetId: validatedInput.spreadsheetId,
      range: updateResponse.data.updatedRange,
      url: validatedInput.url,
      displayText,
      formula: hyperlinkFormula,
      separator: separator,
      updatedCells: updateResponse.data.updatedCells || 0,
    });
  } catch (error) {
    return handleError(error);
  }
}
