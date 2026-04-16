import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetFullSheetSnapshot } from '../../../src/tools/get-full-sheet-snapshot.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetFullSheetSnapshot', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('should return full snapshot without cell formatting', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetId: 0,
              gridProperties: {
                rowCount: 100,
                columnCount: 10,
                frozenRowCount: 1,
                frozenColumnCount: 0,
              },
              tabColor: { red: 1, green: 0, blue: 0 },
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
                  { pixelSize: 150 },
                ],
                rowMetadata: [{ pixelSize: 21 }, { pixelSize: 40 }],
              },
            ],
            conditionalFormats: [{ ranges: [{}] }],
            bandedRanges: [],
          },
        ],
      },
    });

    const result = await handleGetFullSheetSnapshot({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.sheetName).toBe('Sheet1');
    expect(parsed.sheetId).toBe(0);
    expect(parsed.frozenRowCount).toBe(1);
    expect(parsed.totalRows).toBe(100);
    expect(parsed.totalColumns).toBe(10);
    expect(parsed.mergeCount).toBe(1);
    expect(parsed.merges[0].a1Notation).toBe('A1:C1');
    expect(parsed.columns).toHaveLength(2);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.conditionalFormats).toHaveLength(1);
    expect(parsed.bandedRanges).toEqual([]);
    expect(parsed.cellFormatting).toBeUndefined();
  });

  it('should include cell formatting when includeFormattingRange is set', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetId: 0,
              gridProperties: { rowCount: 10, columnCount: 5 },
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                columnMetadata: [{ pixelSize: 100 }],
                rowMetadata: [{ pixelSize: 21 }],
                rowData: [
                  {
                    values: [
                      {
                        userEnteredFormat: {
                          backgroundColor: { red: 1, green: 0, blue: 0 },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await handleGetFullSheetSnapshot({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      includeFormattingRange: 'A1:A1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.cellFormatting).toBeDefined();
    expect(parsed.cellFormatting.range).toBe('Sheet1!A1:A1');
    expect(parsed.cellFormatting.formatType).toBe('userEnteredFormat');
    expect(parsed.cellFormatting.compact).toBe(false);
    expect(parsed.cellFormatting.data[0][0].backgroundColor).toEqual({
      red: 1,
      green: 0,
      blue: 0,
    });
  });

  it('should support compactMode', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetId: 0,
              gridProperties: { rowCount: 10, columnCount: 5 },
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                columnMetadata: [],
                rowMetadata: [],
                rowData: [
                  {
                    values: [
                      {
                        userEnteredFormat: {
                          backgroundColor: { red: 1, green: 0, blue: 0 },
                        },
                      },
                      {
                        userEnteredFormat: {
                          backgroundColor: { red: 1, green: 0, blue: 0 },
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await handleGetFullSheetSnapshot({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      includeFormattingRange: 'A1:B1',
      compactMode: true,
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.cellFormatting).toBeDefined();
    expect(parsed.cellFormatting.compact).toBe(true);
    // Compact mode returns an object keyed by A1 range
    expect(typeof parsed.cellFormatting.data).toBe('object');
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

    const result = await handleGetFullSheetSnapshot({
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

    await handleGetFullSheetSnapshot({ sheetName: 'Sheet1' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('should fail validation when sheetName is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetFullSheetSnapshot({ spreadsheetId: 'test-id' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
