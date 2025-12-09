import { sheets_v4 } from 'googleapis';
import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';

export interface ParsedResourceUri {
  type: 'info' | 'sheets' | 'sheet-data';
  spreadsheetId: string;
  sheetName?: string;
}

/**
 * Parse a resource URI into its components
 * Supported formats:
 * - spreadsheet://{spreadsheetId}/info
 * - spreadsheet://{spreadsheetId}/sheets
 * - spreadsheet://{spreadsheetId}/sheet/{sheetName}
 */
export function parseResourceUri(uri: string): ParsedResourceUri | null {
  // Handle both URL format and direct format
  let path: string;

  if (uri.startsWith('spreadsheet://')) {
    path = uri.slice('spreadsheet://'.length);
  } else {
    return null;
  }

  const parts = path.split('/');

  if (parts.length < 2) {
    return null;
  }

  const spreadsheetId = parts[0];

  if (parts[1] === 'info' && spreadsheetId) {
    return { type: 'info', spreadsheetId };
  }

  if (parts[1] === 'sheets' && spreadsheetId) {
    return { type: 'sheets', spreadsheetId };
  }

  if (parts[1] === 'sheet' && parts.length >= 3 && spreadsheetId) {
    const sheetName = decodeURIComponent(parts.slice(2).join('/'));
    if (sheetName) {
      return { type: 'sheet-data', spreadsheetId, sheetName };
    }
  }

  return null;
}

/**
 * Get spreadsheet metadata/info
 */
export async function readSpreadsheetInfo(
  spreadsheetId: string,
  uri: string
): Promise<ReadResourceResult> {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'spreadsheetId,properties,spreadsheetUrl',
    });

    const data = {
      spreadsheetId: response.data.spreadsheetId,
      title: response.data.properties?.title,
      locale: response.data.properties?.locale,
      timeZone: response.data.properties?.timeZone,
      url: response.data.spreadsheetUrl,
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorResponse = handleError(error);
    const errorText = errorResponse.content[0]?.text ?? 'Unknown error';
    throw new Error(errorText);
  }
}

/**
 * Get list of all sheets in a spreadsheet
 */
export async function readSheetList(
  spreadsheetId: string,
  uri: string
): Promise<ReadResourceResult> {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    const sheetList =
      response.data.sheets?.map((sheet: sheets_v4.Schema$Sheet) => ({
        sheetId: sheet.properties?.sheetId,
        title: sheet.properties?.title,
        index: sheet.properties?.index,
        sheetType: sheet.properties?.sheetType,
        rowCount: sheet.properties?.gridProperties?.rowCount,
        columnCount: sheet.properties?.gridProperties?.columnCount,
        frozenRowCount: sheet.properties?.gridProperties?.frozenRowCount,
        frozenColumnCount: sheet.properties?.gridProperties?.frozenColumnCount,
      })) || [];

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ sheets: sheetList }, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorResponse = handleError(error);
    const errorText = errorResponse.content[0]?.text ?? 'Unknown error';
    throw new Error(errorText);
  }
}

/**
 * Get all data from a specific sheet
 */
export async function readSheetData(
  spreadsheetId: string,
  sheetName: string,
  uri: string
): Promise<ReadResourceResult> {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const values = response.data.values || [];
    const data = {
      range: response.data.range,
      majorDimension: response.data.majorDimension,
      values: values,
      rowCount: values.length,
      columnCount: values[0]?.length || 0,
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorResponse = handleError(error);
    const errorText = errorResponse.content[0]?.text ?? 'Unknown error';
    throw new Error(errorText);
  }
}

/**
 * Resource templates definition
 */
export const resourceTemplates = [
  {
    uriTemplate: 'spreadsheet://{spreadsheetId}/info',
    name: 'Spreadsheet Info',
    description:
      'Get metadata about a Google Spreadsheet including title, locale, timezone, and URL',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'spreadsheet://{spreadsheetId}/sheets',
    name: 'Sheet List',
    description:
      'List all sheets in a spreadsheet with their properties (id, title, row/column counts, frozen rows/columns)',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'spreadsheet://{spreadsheetId}/sheet/{sheetName}',
    name: 'Sheet Data',
    description: 'Get all data from a specific sheet by name',
    mimeType: 'application/json',
  },
];

/**
 * Handle resource read request
 */
export async function handleResourceRead(uri: string): Promise<ReadResourceResult> {
  const parsed = parseResourceUri(uri);

  if (!parsed) {
    throw new Error(
      `Invalid resource URI: ${uri}. Expected format: spreadsheet://{spreadsheetId}/info, spreadsheet://{spreadsheetId}/sheets, or spreadsheet://{spreadsheetId}/sheet/{sheetName}`
    );
  }

  switch (parsed.type) {
    case 'info':
      return readSpreadsheetInfo(parsed.spreadsheetId, uri);
    case 'sheets':
      return readSheetList(parsed.spreadsheetId, uri);
    case 'sheet-data':
      if (!parsed.sheetName) {
        throw new Error('Sheet name is required for sheet-data resource');
      }
      return readSheetData(parsed.spreadsheetId, parsed.sheetName, uri);
  }
}
