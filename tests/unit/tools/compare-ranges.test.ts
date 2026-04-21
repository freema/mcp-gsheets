import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCompareRanges } from '../../../src/tools/compare-ranges.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleCompareRanges', () => {
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
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredFormat: { textFormat: { bold: true } } },
                      { userEnteredFormat: { backgroundColor: { red: 1 } } },
                    ],
                  },
                ],
              },
              {
                startRow: 1,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      { userEnteredFormat: { textFormat: { bold: true } } },
                      { userEnteredFormat: { backgroundColor: { red: 1 } } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await handleCompareRanges({
      spreadsheetId: 'test-id',
      rangeA: "'My Sheet'!a1:b1",
      rangeB: "'My Sheet'!A2:B2",
    });

    const parsed = JSON.parse(result.content[0].text.split('\n\n')[1]);
    expect(parsed.identical).toBe(true);
    expect(parsed.diffCount).toBe(0);
    expect(parsed.dimensions).toEqual({ rows: 1, cols: 2, totalCells: 2 });
  });

  it('respects fields filter when comparing formatting', async () => {
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
                          backgroundColor: { red: 1 },
                          textFormat: { bold: true },
                        },
                      },
                    ],
                  },
                ],
              },
              {
                startRow: 1,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      {
                        userEnteredFormat: {
                          backgroundColor: { red: 1 },
                          textFormat: { bold: false },
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

    const filteredResult = await handleCompareRanges({
      spreadsheetId: 'test-id',
      rangeA: 'Sheet1!A1:A1',
      rangeB: 'Sheet1!A2:A2',
      fields: ['backgroundColor'],
    });
    const filtered = JSON.parse(filteredResult.content[0].text.split('\n\n')[1]);
    expect(filtered.identical).toBe(true);
    expect(filtered.diffCount).toBe(0);

    const textOnlyResult = await handleCompareRanges({
      spreadsheetId: 'test-id',
      rangeA: 'Sheet1!A1:A1',
      rangeB: 'Sheet1!A2:A2',
      fields: ['textFormat'],
    });
    const textOnly = JSON.parse(textOnlyResult.content[0].text.split('\n\n')[1]);
    expect(textOnly.identical).toBe(false);
    expect(textOnly.diffCount).toBe(1);
    expect(textOnly.diffs[0].diffs.textFormat).toBeDefined();
  });

  it('returns an error when ranges have different dimensions', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: dimension mismatch' }],
    } as any);

    const result = await handleCompareRanges({
      spreadsheetId: 'test-id',
      rangeA: 'Sheet1!A1:A1',
      rangeB: 'Sheet1!A1:B1',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
    expect(result.content[0].text).toContain('Error');
  });
});
