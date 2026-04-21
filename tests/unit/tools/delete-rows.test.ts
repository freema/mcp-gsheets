import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleDeleteRows } from '../../../src/tools/delete-rows.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';
import * as rangeHelpers from '../../../src/utils/range-helpers.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');
vi.mock('../../../src/utils/range-helpers.js');

describe('handleDeleteRows', () => {
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
      range: '2:4',
    });
    vi.mocked(rangeHelpers.getSheetId).mockResolvedValue(0);
  });

  it('should delete rows using a deleteDimension request', async () => {
    mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

    const result = await handleDeleteRows({
      spreadsheetId: 'test-id',
      range: 'Sheet1!2:4',
    });

    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: 'test-id',
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
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
          text: expect.stringContaining('Successfully deleted 3 rows'),
        }),
      ],
    });
  });

  it('should fall back to the first sheet when no sheet name is provided', async () => {
    vi.mocked(rangeHelpers.extractSheetName).mockReturnValue({
      range: '3:3',
    });
    mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });

    await handleDeleteRows({
      spreadsheetId: 'test-id',
      range: '3:3',
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
                  dimension: 'ROWS',
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

    const result = await handleDeleteRows({
      spreadsheetId: 'test-id',
      range: 'Sheet1!2:4',
    });

    expect(errorHandler.handleError).toHaveBeenCalledWith(error);
    expect(result).toMatchObject({
      content: [{ type: 'text', text: 'Error occurred' }],
    });
  });
});
