import { sheets_v4 } from 'googleapis';

/**
 * Convert column letter(s) to zero-based index
 * A = 0, B = 1, Z = 25, AA = 26, etc.
 */
export function columnToIndex(column: string): number {
  let index = 0;
  for (let i = 0; i < column.length; i++) {
    index = index * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return index - 1;
}

/**
 * Parse A1 notation range to GridRange
 * Supports formats like "A1:B10" or "Sheet1!A1:B10"
 */
export function parseRange(range: string, sheetId?: number): sheets_v4.Schema$GridRange {
  // Remove sheet name if present
  const rangePart = range.includes('!') ? range.split('!')[1] : range;
  if (!rangePart) {
    throw new Error(`Invalid range format: ${range}`);
  }

  // Handle single cell
  const singleCellMatch = rangePart.match(/^([A-Z]+)(\d+)$/);
  if (singleCellMatch?.[1] && singleCellMatch[2]) {
    const col = columnToIndex(singleCellMatch[1]);
    const row = parseInt(singleCellMatch[2]) - 1;
    return {
      sheetId: sheetId ?? null,
      startRowIndex: row,
      endRowIndex: row + 1,
      startColumnIndex: col,
      endColumnIndex: col + 1,
    };
  }

  // Handle range
  const rangeMatch = rangePart.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!rangeMatch?.[1] || !rangeMatch[2] || !rangeMatch[3] || !rangeMatch[4]) {
    throw new Error(`Invalid range format: ${range}`);
  }

  return {
    sheetId: sheetId ?? null,
    startRowIndex: parseInt(rangeMatch[2]) - 1,
    endRowIndex: parseInt(rangeMatch[4]),
    startColumnIndex: columnToIndex(rangeMatch[1]),
    endColumnIndex: columnToIndex(rangeMatch[3]) + 1,
  };
}

/**
 * Get sheet ID from sheet name
 */
export async function getSheetId(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName?: string
): Promise<number> {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  });

  const sheetsData = response.data.sheets || [];

  if (sheetName) {
    const sheet = sheetsData.find((s) => s.properties?.title === sheetName);
    if (!sheet?.properties?.sheetId) {
      const availableSheets = sheetsData
        .map((s) => s.properties?.title)
        .filter((title) => title)
        .join(', ');
      throw new Error(`Sheet "${sheetName}" not found. Available sheets: ${availableSheets}`);
    }
    return sheet.properties.sheetId;
  }

  // Return first sheet if no name specified
  if (sheetsData.length > 0) {
    const firstSheet = sheetsData[0];
    if (firstSheet?.properties?.sheetId !== undefined && firstSheet.properties.sheetId !== null) {
      return firstSheet.properties.sheetId;
    }
  }

  throw new Error('No sheets found in spreadsheet');
}

/**
 * Extract sheet name from range if present
 */
export function extractSheetName(range: string): { sheetName?: string; range: string } {
  if (range.includes('!')) {
    const parts = range.split('!');
    let sheetName = parts[0];
    const rangePart = parts[1] || '';
    if (sheetName) {
      // Remove surrounding quotes if present (both single and double quotes)
      if (
        (sheetName.startsWith('"') && sheetName.endsWith('"')) ||
        (sheetName.startsWith("'") && sheetName.endsWith("'"))
      ) {
        sheetName = sheetName.slice(1, -1);
      }
      return { sheetName, range: rangePart };
    }
  }
  return { range };
}
