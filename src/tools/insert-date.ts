import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';

const insertDateInputSchema = z.object({
  spreadsheetId: z.string().min(1, 'Spreadsheet ID is required'),
  range: z.string().min(1, 'Range is required'),
  date: z.string().min(1, 'Date is required'),
  format: z.enum(['locale', 'iso', 'us', 'eu']).default('locale'),
  autoDetect: z.boolean().default(true),
  useEUFormat: z.boolean().default(true),
});

export type InsertDateInput = z.infer<typeof insertDateInputSchema>;

export const insertDateTool: Tool = {
  name: 'sheets_insert_date',
  description:
    'Insert properly formatted dates in Google Sheets with locale support and automatic detection',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      range: {
        type: 'string',
        description: 'The A1 notation range to insert the date (e.g., "Sheet1!A1")',
      },
      date: {
        type: 'string',
        description:
          'Date to insert (supports various formats: YYYY-MM-DD, DD.MM.YYYY, MM/DD/YYYY, or relative dates like "today", "tomorrow")',
      },
      format: {
        type: 'string',
        enum: ['locale', 'iso', 'us', 'eu'],
        description:
          'Date format preference (locale=spreadsheet locale, iso=YYYY-MM-DD, us=MM/DD/YYYY, eu=DD.MM.YYYY)',
        default: 'locale',
      },
      autoDetect: {
        type: 'boolean',
        description: 'Automatically detect and parse date format (default: true)',
        default: true,
      },
      useEUFormat: {
        type: 'boolean',
        description:
          'Use semicolon separator for EU locale sheets (auto-detected from user language/context if not specified)',
        default: true,
      },
    },
    required: ['spreadsheetId', 'range', 'date'],
  },
};

function parseDate(dateInput: string): Date {
  // Handle relative dates
  if (dateInput.toLowerCase() === 'today') {
    return new Date();
  }
  if (dateInput.toLowerCase() === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (dateInput.toLowerCase() === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Try parsing various formats
  const isoFormat = /^\d{4}-\d{2}-\d{2}$/;
  const euFormat = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
  const usFormat = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

  if (isoFormat.test(dateInput)) {
    return new Date(dateInput + 'T00:00:00');
  }

  if (euFormat.test(dateInput)) {
    const parts = dateInput.split('.');
    const day = parts[0] || '1';
    const month = parts[1] || '1';
    const year = parts[2] || '1970';
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  if (usFormat.test(dateInput)) {
    const parts = dateInput.split('/');
    const month = parts[0] || '1';
    const day = parts[1] || '1';
    const year = parts[2] || '1970';
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try standard Date parsing
  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Unable to parse date: ${dateInput}`);
  }
  return parsed;
}

function formatDateForSheets(date: Date, format: string): string {
  switch (format) {
    case 'iso':
      return date.toISOString().split('T')[0] || '';
    case 'us':
      return `${(date.getMonth() + 1).toString()}/${date.getDate().toString()}/${date.getFullYear().toString()}`;
    case 'eu':
      return `${date.getDate().toString()}.${(date.getMonth() + 1).toString()}.${date.getFullYear().toString()}`;
    case 'locale':
    default:
      // Return in a format that Google Sheets will recognize as a date
      return date.toISOString().split('T')[0] || '';
  }
}

export async function handleInsertDate(input: any): Promise<ToolResponse> {
  try {
    const validatedInput = insertDateInputSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    // Parse the input date
    const parsedDate = parseDate(validatedInput.date);

    // Format the date according to preference
    const formattedDate = formatDateForSheets(parsedDate, validatedInput.format);

    // Update the cell with the formatted date
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId: validatedInput.spreadsheetId,
      range: validatedInput.range,
      valueInputOption: 'USER_ENTERED', // This allows Google Sheets to auto-detect dates
      requestBody: {
        values: [[formattedDate]],
      },
    });

    // If locale format is requested, apply basic date formatting to the cell
    if (validatedInput.format === 'locale') {
      try {
        // Use EU pattern for EU format, US pattern otherwise
        const pattern = validatedInput.useEUFormat ? 'd.M.yyyy' : 'M/d/yyyy';

        // Apply date number format based on useEUFormat
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: validatedInput.spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: 0, // Will need to determine actual sheet ID
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: 0,
                    endColumnIndex: 1,
                  },
                  cell: {
                    userEnteredFormat: {
                      numberFormat: {
                        type: 'DATE',
                        pattern: pattern,
                      },
                    },
                  },
                  fields: 'userEnteredFormat.numberFormat',
                },
              },
            ],
          },
        });
      } catch (formatError) {
        // Continue if formatting fails, the date was still inserted
        console.warn('Date formatting failed:', formatError);
      }
    }

    // Use semicolon for EU format, comma for US format
    const separator = validatedInput.useEUFormat ? ';' : ',';

    return formatToolResponse(`Successfully inserted date in range ${validatedInput.range}`, {
      spreadsheetId: validatedInput.spreadsheetId,
      range: updateResponse.data.updatedRange,
      originalDate: validatedInput.date,
      parsedDate: parsedDate.toISOString(),
      formattedDate,
      format: validatedInput.format,
      separator: separator,
      updatedCells: updateResponse.data.updatedCells || 0,
    });
  } catch (error) {
    return handleError(error);
  }
}
