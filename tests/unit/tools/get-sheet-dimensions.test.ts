import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetSheetDimensions } from '../../../src/tools/get-sheet-dimensions.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetSheetDimensions', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('should return dimensions with columns and rows metadata', async () => {
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
                frozenColumnCount: 2,
              },
              tabColor: { red: 1, green: 0, blue: 0 },
            },
            data: [
              {
                columnMetadata: [
                  { pixelSize: 100, hiddenByUser: false },
                  { pixelSize: 150, hiddenByUser: true },
                ],
                rowMetadata: [
                  { pixelSize: 21, hiddenByUser: false },
                  { pixelSize: 40, hiddenByUser: false },
                  { pixelSize: 21, hiddenByUser: true },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await handleGetSheetDimensions({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.frozenRowCount).toBe(1);
    expect(parsed.frozenColumnCount).toBe(2);
    expect(parsed.totalRows).toBe(1000);
    expect(parsed.totalColumns).toBe(26);
    expect(parsed.columns).toHaveLength(2);
    expect(parsed.columns[0].pixelSize).toBe(100);
    expect(parsed.columns[1].hiddenByUser).toBe(true);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[2].hiddenByUser).toBe(true);
    expect(parsed.tabColor).toEqual({ red: 1, green: 0, blue: 0 });
  });

  it('should handle sheet with no data section', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetId: 0,
              gridProperties: { rowCount: 100, columnCount: 10 },
            },
          },
        ],
      },
    });

    const result = await handleGetSheetDimensions({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.frozenRowCount).toBe(0);
    expect(parsed.frozenColumnCount).toBe(0);
    expect(parsed.columns).toEqual([]);
    expect(parsed.rows).toEqual([]);
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

    const result = await handleGetSheetDimensions({
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

    await handleGetSheetDimensions({ sheetName: 'Sheet1' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('should fail validation when sheetName is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetSheetDimensions({ spreadsheetId: 'test-id' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
