import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  columnToIndex,
  parseRange,
  getSheetId,
  extractSheetName,
} from '../../../src/utils/range-helpers';
import { sheets_v4 } from 'googleapis';

describe('columnToIndex', () => {
  it('should convert single letters correctly', () => {
    expect(columnToIndex('A')).toBe(0);
    expect(columnToIndex('B')).toBe(1);
    expect(columnToIndex('C')).toBe(2);
    expect(columnToIndex('Z')).toBe(25);
  });

  it('should convert double letters correctly', () => {
    expect(columnToIndex('AA')).toBe(26);
    expect(columnToIndex('AB')).toBe(27);
    expect(columnToIndex('AZ')).toBe(51);
    expect(columnToIndex('BA')).toBe(52);
    expect(columnToIndex('ZZ')).toBe(701);
  });

  it('should convert triple letters correctly', () => {
    expect(columnToIndex('AAA')).toBe(702);
    expect(columnToIndex('AAB')).toBe(703);
    expect(columnToIndex('XFD')).toBe(16383); // Excel's last column
  });

  it('should handle edge cases', () => {
    expect(columnToIndex('AAA')).toBe(702);
    expect(columnToIndex('ZZZ')).toBe(18277);
  });
});

describe('parseRange', () => {
  describe('single cell parsing', () => {
    it('should parse single cell without sheet ID', () => {
      const result = parseRange('A1');
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 1,
      });
    });

    it('should parse single cell with sheet ID', () => {
      const result = parseRange('B5', 123);
      expect(result).toEqual({
        sheetId: 123,
        startRowIndex: 4,
        endRowIndex: 5,
        startColumnIndex: 1,
        endColumnIndex: 2,
      });
    });

    it('should parse cells with multiple letter columns', () => {
      const result = parseRange('AA10');
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 9,
        endRowIndex: 10,
        startColumnIndex: 26,
        endColumnIndex: 27,
      });
    });

    it('should handle large row numbers', () => {
      const result = parseRange('A1000');
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 999,
        endRowIndex: 1000,
        startColumnIndex: 0,
        endColumnIndex: 1,
      });
    });
  });

  describe('range parsing', () => {
    it('should parse simple range', () => {
      const result = parseRange('A1:B2');
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 0,
        endRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: 2,
      });
    });

    it('should parse range with sheet ID', () => {
      const result = parseRange('C3:E5', 456);
      expect(result).toEqual({
        sheetId: 456,
        startRowIndex: 2,
        endRowIndex: 5,
        startColumnIndex: 2,
        endColumnIndex: 5,
      });
    });

    it('should parse range with multiple letter columns', () => {
      const result = parseRange('AA1:AB10');
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 0,
        endRowIndex: 10,
        startColumnIndex: 26,
        endColumnIndex: 28,
      });
    });

    it('should parse large ranges', () => {
      const result = parseRange('A1:ZZ1000');
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 0,
        endRowIndex: 1000,
        startColumnIndex: 0,
        endColumnIndex: 702,
      });
    });
  });

  describe('with sheet names', () => {
    it('should ignore sheet name in range', () => {
      const result = parseRange('Sheet1!A1:B2');
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 0,
        endRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: 2,
      });
    });

    it('should handle quoted sheet names', () => {
      const result = parseRange("'My Sheet'!C5:D10");
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 4,
        endRowIndex: 10,
        startColumnIndex: 2,
        endColumnIndex: 4,
      });
    });

    it('should handle sheet names with special characters', () => {
      const result = parseRange("'Sheet (2024)'!A1");
      expect(result).toEqual({
        sheetId: null,
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 0,
        endColumnIndex: 1,
      });
    });
  });

  describe('error cases', () => {
    it('should throw error for invalid formats', () => {
      expect(() => parseRange('A')).toThrow('Invalid range format: A');
      expect(() => parseRange('1')).toThrow('Invalid range format: 1');
      expect(() => parseRange('A1:')).toThrow('Invalid range format: A1:');
      expect(() => parseRange(':B2')).toThrow('Invalid range format: :B2');
      expect(() => parseRange('A1:B')).toThrow('Invalid range format: A1:B');
      expect(() => parseRange('A1:2')).toThrow('Invalid range format: A1:2');
    });

    it('should throw error for empty range after sheet name', () => {
      expect(() => parseRange('Sheet1!')).toThrow('Invalid range format: Sheet1!');
    });

    it('should throw error for lowercase column letters', () => {
      expect(() => parseRange('a1')).toThrow('Invalid range format: a1');
      expect(() => parseRange('A1:b2')).toThrow('Invalid range format: A1:b2');
    });


    it('should throw error for mixed formats', () => {
      expect(() => parseRange('A1B2')).toThrow('Invalid range format: A1B2');
      expect(() => parseRange('1A')).toThrow('Invalid range format: 1A');
    });
  });

  describe('edge cases', () => {
    it('should handle sheet ID 0', () => {
      const result = parseRange('A1', 0);
      expect(result.sheetId).toBe(0);
    });

    it('should handle undefined sheet ID as null', () => {
      const result = parseRange('A1', undefined);
      expect(result.sheetId).toBe(null);
    });
  });
});

describe('getSheetId', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  } as unknown as sheets_v4.Sheets;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return sheet ID by name', async () => {
    (mockSheets.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 0, title: 'Sheet1' } },
          { properties: { sheetId: 123, title: 'MySheet' } },
          { properties: { sheetId: 456, title: 'Data' } },
        ],
      },
    });

    const result = await getSheetId(mockSheets, 'spreadsheet-id', 'MySheet');
    expect(result).toBe(123);

    expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
      fields: 'sheets.properties',
    });
  });

  it('should return first sheet ID when no name specified', async () => {
    (mockSheets.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 789, title: 'FirstSheet' } },
          { properties: { sheetId: 123, title: 'SecondSheet' } },
        ],
      },
    });

    const result = await getSheetId(mockSheets, 'spreadsheet-id');
    expect(result).toBe(789);
  });

  it('should throw error when sheet name not found', async () => {
    (mockSheets.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 0, title: 'Sheet1' } },
          { properties: { sheetId: 1, title: 'Sheet2' } },
        ],
      },
    });

    await expect(getSheetId(mockSheets, 'spreadsheet-id', 'NonExistent'))
      .rejects.toThrow('Sheet "NonExistent" not found');
  });

  it('should throw error when no sheets in spreadsheet', async () => {
    (mockSheets.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [],
      },
    });

    await expect(getSheetId(mockSheets, 'spreadsheet-id'))
      .rejects.toThrow('No sheets found in spreadsheet');
  });


  it('should handle sheet with ID 0', async () => {
    (mockSheets.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 0, title: 'Sheet1' } },
        ],
      },
    });

    const result = await getSheetId(mockSheets, 'spreadsheet-id');
    expect(result).toBe(0);
  });

  it('should handle null/undefined sheets array', async () => {
    (mockSheets.spreadsheets.get as any).mockResolvedValue({
      data: {},
    });

    await expect(getSheetId(mockSheets, 'spreadsheet-id'))
      .rejects.toThrow('No sheets found in spreadsheet');
  });

  it('should handle case-sensitive sheet names', async () => {
    (mockSheets.spreadsheets.get as any).mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 1, title: 'mysheet' } },
          { properties: { sheetId: 2, title: 'MySheet' } },
          { properties: { sheetId: 3, title: 'MYSHEET' } },
        ],
      },
    });

    const result = await getSheetId(mockSheets, 'spreadsheet-id', 'MySheet');
    expect(result).toBe(2);
  });
});

describe('extractSheetName', () => {
  it('should extract simple sheet name', () => {
    const result = extractSheetName('Sheet1!A1:B10');
    expect(result).toEqual({
      sheetName: 'Sheet1',
      range: 'A1:B10',
    });
  });

  it('should extract quoted sheet name', () => {
    const result = extractSheetName("'My Sheet'!A1");
    expect(result).toEqual({
      sheetName: "'My Sheet'",
      range: 'A1',
    });
  });

  it('should handle sheet name with special characters', () => {
    const result = extractSheetName("'Sheet (2024) - Data'!A:Z");
    expect(result).toEqual({
      sheetName: "'Sheet (2024) - Data'",
      range: 'A:Z',
    });
  });

  it('should handle range without sheet name', () => {
    const result = extractSheetName('A1:B10');
    expect(result).toEqual({
      range: 'A1:B10',
    });
  });

  it('should handle empty range after exclamation', () => {
    const result = extractSheetName('Sheet1!');
    expect(result).toEqual({
      sheetName: 'Sheet1',
      range: '',
    });
  });




});