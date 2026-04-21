import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetBorderMap } from '../../../src/tools/get-border-map.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetBorderMap', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('handles quoted sheet names and lowercase A1 ranges', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'My Sheet' },
            data: [
              {
                rowData: [{ values: [{ userEnteredFormat: { borders: {} } }] }],
              },
            ],
          },
        ],
      },
    });

    const result = await handleGetBorderMap({
      spreadsheetId: 'test-id',
      range: "'My Sheet'!a1:a1",
    });

    const parsed = JSON.parse(result.content[0].text.split('\n\n')[1]);
    expect(parsed.sheetName).toBe('My Sheet');
    expect(parsed.dimensions).toEqual({ rows: 1, cols: 1 });
  });

  it('returns an error for an invalid range format', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: invalid range' }],
    } as any);

    const result = await handleGetBorderMap({
      spreadsheetId: 'test-id',
      range: 'Sheet1!A1',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
    expect(result.content[0].text).toContain('Error');
  });

  it('resolves horizontal and vertical lines correctly for a minimal grid', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1' },
            data: [
              {
                rowData: [
                  {
                    values: [
                      {
                        userEnteredFormat: {
                          borders: {
                            bottom: { style: 'SOLID' },
                            right: { style: 'DASHED' },
                          },
                        },
                      },
                      {
                        userEnteredFormat: {
                          borders: {
                            left: { style: 'DOTTED' },
                          },
                        },
                      },
                    ],
                  },
                  {
                    values: [
                      {
                        userEnteredFormat: {
                          borders: {
                            top: { style: 'DOUBLE' },
                            right: { style: 'SOLID_MEDIUM' },
                          },
                        },
                      },
                      {
                        userEnteredFormat: {
                          borders: {
                            top: { style: 'SOLID' },
                          },
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

    const result = await handleGetBorderMap({
      spreadsheetId: 'test-id',
      range: 'Sheet1!A1:B2',
    });

    const parsed = JSON.parse(result.content[0].text.split('\n\n')[1]);
    expect(parsed.horizontalLines.data).toEqual([
      [null, null],
      ['SOLID', 'SOLID'],
      [null, null],
    ]);
    expect(parsed.verticalLines.data).toEqual([
      [null, 'DOTTED', null],
      [null, 'SOLID_MEDIUM', null],
    ]);
  });
});
