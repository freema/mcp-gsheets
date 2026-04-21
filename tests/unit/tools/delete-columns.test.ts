import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleDeleteColumns } from '../../../src/tools/delete-columns.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';
import * as rangeHelpers from '../../../src/utils/range-helpers.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');
vi.mock('../../../src/utils/range-helpers.js');

describe('handleDeleteColumns', () => {
  const mockSheets = {
    spreadsheets: {
      batchUpdate: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
    vi.mocked(rangeHelpers.extractSheetName).mockReturnValue({
      sheetName: 'Sheet1',
      range: 'B:D',
    });
    vi.mocked(rangeHelpers.getSheetId).mockResolvedValue(0);
    vi.mocked(rangeHelpers.columnToIndex).mockImplementation((column: string) => {
      const map: Record<string, number> = { B: 1, C: 2, D: 3 };
      return map[column] ?? 0;
    });
  });

  it('should delete columns using a deleteDimension request', async () => {
    mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

    const result = await handleDeleteColumns({
      spreadsheetId: 'test-id',
      range: 'Sheet1!B:D',
    });

    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: 'test-id',
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 1,
                endIndex: 4,
              },
            },
          },
        ],
      },
    });

    expect(result).toMatchObject({
      content: [
        expect.objectContaining({
          text: expect.stringContaining('Successfully deleted 3 columns'),
        }),
      ],
    });
  });

  it('should fall back to the first sheet when no sheet name is provided', async () => {
    vi.mocked(rangeHelpers.extractSheetName).mockReturnValue({
      range: 'C:C',
    });
    vi.mocked(rangeHelpers.columnToIndex).mockImplementation((column: string) =>
      column === 'C' ? 2 : 0
    );
    mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

    await handleDeleteColumns({
      spreadsheetId: 'test-id',
      range: 'C:C',
    });

    expect(rangeHelpers.getSheetId).toHaveBeenCalledWith(mockSheets as any, 'test-id', undefined);
    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 2,
                  endIndex: 3,
                },
              },
            },
          ],
        },
      })
    );
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    mockSheets.spreadsheets.batchUpdate.mockRejectedValue(error);
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error occurred' }],
    } as any);

    const result = await handleDeleteColumns({
      spreadsheetId: 'test-id',
      range: 'Sheet1!B:D',
    });

    expect(errorHandler.handleError).toHaveBeenCalledWith(error);
    expect(result).toMatchObject({
      content: [{ type: 'text', text: 'Error occurred' }],
    });
  });
});
