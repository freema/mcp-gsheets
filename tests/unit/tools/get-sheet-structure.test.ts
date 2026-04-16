import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetSheetStructure } from '../../../src/tools/get-sheet-structure.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetSheetStructure', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('should return full structural metadata', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetId: 0,
              gridProperties: {
                rowCount: 1000,
                columnCount: 26,
                frozenRowCount: 1,
                frozenColumnCount: 0,
              },
              tabColor: { red: 0, green: 0, blue: 1 },
              tabColorStyle: { rgbColor: { red: 0, green: 0, blue: 1 } },
            },
            merges: [
              {
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 3,
              },
            ],
            data: [
              {
                columnMetadata: [
                  { pixelSize: 100, hiddenByUser: false },
                  { pixelSize: 80, hiddenByUser: true },
                  { pixelSize: 120 },
                ],
                rowMetadata: [
                  { pixelSize: 21 },
                  { pixelSize: 40, hiddenByUser: true },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await handleGetSheetStructure({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.sheetName).toBe('Sheet1');
    expect(parsed.sheetId).toBe(0);
    expect(parsed.sheetIndex).toBe(0);
    expect(parsed.dimensions.rowCount).toBe(1000);
    expect(parsed.dimensions.columnCount).toBe(26);
    expect(parsed.frozen.rowCount).toBe(1);
    expect(parsed.frozen.columnCount).toBe(0);
    expect(parsed.columnWidths).toEqual([100, 80, 120]);
    expect(parsed.rowHeights).toEqual([21, 40]);
    expect(parsed.hiddenColumns).toEqual([1]);
    expect(parsed.hiddenRows).toEqual([1]);
    expect(parsed.mergeCount).toBe(1);
    expect(parsed.merges[0]).toBe('A1:C1');
    expect(parsed.tabColor).toEqual({ red: 0, green: 0, blue: 1 });
  });

  it('should handle sheet with no merges or hidden dimensions', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetId: 0,
              gridProperties: { rowCount: 100, columnCount: 10 },
            },
            data: [
              {
                columnMetadata: [{ pixelSize: 100 }],
                rowMetadata: [{ pixelSize: 21 }],
              },
            ],
          },
        ],
      },
    });

    const result = await handleGetSheetStructure({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.mergeCount).toBe(0);
    expect(parsed.merges).toEqual([]);
    expect(parsed.hiddenColumns).toEqual([]);
    expect(parsed.hiddenRows).toEqual([]);
  });

  it('should throw when sheet is not found', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [{ properties: { title: 'Other', sheetId: 1 } }],
      },
    });

    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: Sheet not found' }],
    } as any);

    const result = await handleGetSheetStructure({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
    expect(result.content[0].text).toContain('Error');
  });

  it('should fail validation when spreadsheetId is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetSheetStructure({ sheetName: 'Sheet1' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('should fail validation when sheetName is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetSheetStructure({ spreadsheetId: 'test-id' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
