import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAppendValues } from '../../../src/tools/append-values.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleAppendValues', () => {
  const mockSheets = {
    spreadsheets: {
      values: {
        append: vi.fn(),
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

  it('should successfully append values and return formatted response', async () => {
    mockSheets.spreadsheets.values.append.mockResolvedValue({
      data: {
        updates: {
          updatedCells: 6,
          updatedRange: 'Sheet1!A1:B3',
        },
      },
    });

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:B3',
      values: [['a', 'b'], ['c', 'd'], ['e', 'f']],
    };

    const result = await handleAppendValues(input);

    expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
      spreadsheetId: input.spreadsheetId,
      range: input.range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'OVERWRITE',
      requestBody: { values: input.values },
    });
    expect(result.content[0].text).toContain('6 cells');
    expect(result.content[0].text).toContain('Sheet1!A1:B3');
  });

  it('should use || {} fallback when updates is undefined', async () => {
    mockSheets.spreadsheets.values.append.mockResolvedValue({
      data: {},
    });

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A:B',
      values: [['x', 'y']],
    };

    // Should not throw - uses {} fallback
    await handleAppendValues(input);
    expect(mockSheets.spreadsheets.values.append).toHaveBeenCalled();
  });

  it('should handle API errors by calling handleError', async () => {
    const error = new Error('API error');
    mockSheets.spreadsheets.values.append.mockRejectedValue(error);

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A:B',
      values: [['x']],
    };

    await handleAppendValues(input);
    expect(errorHandler.handleError).toHaveBeenCalledWith(error);
  });

  it('should apply valueInputOption when provided', async () => {
    mockSheets.spreadsheets.values.append.mockResolvedValue({
      data: { updates: { updatedCells: 1, updatedRange: 'Sheet1!A1' } },
    });

    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A:B',
      values: [['x']],
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
    };

    await handleAppendValues(input);

    expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith(
      expect.objectContaining({
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
      })
    );
  });
});
