import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetFormattingCompact } from '../../../src/tools/get-formatting-compact.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetFormattingCompact', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('should return compact formatting data', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1' },
            data: [
              {
                startRow: 0,
                startColumn: 0,
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

    const result = await handleGetFormattingCompact({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      range: 'A1:B2',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.range).toBe('Sheet1!A1:B2');
    expect(parsed.formatType).toBe('userEnteredFormat');
    // All 4 cells have the same format, so they should be compacted into one range
    expect(parsed.rangeCount).toBe(1);
    const key = Object.keys(parsed.data)[0];
    expect(parsed.data[key].backgroundColor).toEqual({ red: 1, green: 0, blue: 0 });
  });

  it('should return empty data when no formatting exists', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1' },
            data: [{}],
          },
        ],
      },
    });

    const result = await handleGetFormattingCompact({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      range: 'A1:B2',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.rangeCount).toBe(0);
    expect(parsed.data).toEqual({});
  });

  it('should use effectiveFormat when requested', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1' },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      {
                        effectiveFormat: {
                          textFormat: { bold: true },
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

    const result = await handleGetFormattingCompact({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      range: 'A1',
      useEffectiveFormat: true,
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.formatType).toBe('effectiveFormat');
    expect(parsed.rangeCount).toBe(1);
  });

  it('should filter fields when specified', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1' },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      {
                        userEnteredFormat: {
                          backgroundColor: { red: 1, green: 0, blue: 0 },
                          textFormat: { bold: true },
                          borders: { top: {} },
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

    const result = await handleGetFormattingCompact({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      range: 'A1',
      fields: ['backgroundColor'],
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    const key = Object.keys(parsed.data)[0];
    expect(parsed.data[key].backgroundColor).toBeDefined();
    expect(parsed.data[key].textFormat).toBeUndefined();
    expect(parsed.data[key].borders).toBeUndefined();
  });

  it('should throw when sheet is not found', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [{ properties: { title: 'Other' } }],
      },
    });

    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: Sheet not found' }],
    } as any);

    const result = await handleGetFormattingCompact({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      range: 'A1:B2',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
    expect(result.content[0].text).toContain('Error');
  });

  it('should fail validation when range is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetFormattingCompact({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('should fail validation when spreadsheetId is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetFormattingCompact({
      sheetName: 'Sheet1',
      range: 'A1:B2',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
