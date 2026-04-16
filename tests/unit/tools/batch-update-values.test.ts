import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBatchUpdateValues } from '../../../src/tools/batch-update-values.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleBatchUpdateValues', () => {
  const mockSheets = {
    spreadsheets: {
      values: {
        batchUpdate: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
    vi.mocked(errorHandler.handleError).mockImplementation((err: any) => ({
      content: [{ type: 'text', text: `Error: ${err.message}` }],
    }));
  });

  it('should successfully batch update and sum updatedCells across responses', async () => {
    mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        responses: [
          { updatedCells: 4 },
          { updatedCells: 6 },
        ],
      },
    });

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [
        { range: 'Sheet1!A1:B2', values: [['a', 'b'], ['c', 'd']] },
        { range: 'Sheet1!C1:D3', values: [['e', 'f'], ['g', 'h'], ['i', 'j']] },
      ],
    };

    const result = await handleBatchUpdateValues(input);

    expect(mockSheets.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: input.spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Sheet1!A1:B2', values: [['a', 'b'], ['c', 'd']] },
          { range: 'Sheet1!C1:D3', values: [['e', 'f'], ['g', 'h'], ['i', 'j']] },
        ],
      },
    });
    expect(result.content[0].text).toContain('10 cells');
  });

  it('should return 0 cells when responses is null/undefined', async () => {
    mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {},
    });

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [{ range: 'Sheet1!A1', values: [['x']] }],
    };

    const result = await handleBatchUpdateValues(input);
    expect(result.content[0].text).toContain('0 cells');
  });

  it('should handle missing updatedCells in individual responses (uses || 0)', async () => {
    mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: {
        responses: [
          { updatedCells: 3 },
          {},
          { updatedCells: 2 },
        ],
      },
    });

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [
        { range: 'Sheet1!A1', values: [['a']] },
        { range: 'Sheet1!B1', values: [['b']] },
        { range: 'Sheet1!C1', values: [['c']] },
      ],
    };

    const result = await handleBatchUpdateValues(input);
    expect(result.content[0].text).toContain('5 cells');
  });

  it('should handle API errors by calling handleError', async () => {
    const error = new Error('API failure');
    mockSheets.spreadsheets.values.batchUpdate.mockRejectedValue(error);

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [{ range: 'Sheet1!A1', values: [['x']] }],
    };

    await handleBatchUpdateValues(input);
    expect(errorHandler.handleError).toHaveBeenCalledWith(error);
  });

  it('should use valueInputOption RAW when specified', async () => {
    mockSheets.spreadsheets.values.batchUpdate.mockResolvedValue({
      data: { responses: [{ updatedCells: 1 }] },
    });

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [{ range: 'Sheet1!A1', values: [['x']] }],
      valueInputOption: 'RAW',
    };

    await handleBatchUpdateValues(input);

    expect(mockSheets.spreadsheets.values.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ valueInputOption: 'RAW' }),
      })
    );
  });
});
