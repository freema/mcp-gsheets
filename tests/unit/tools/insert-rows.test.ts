import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInsertRows } from '../../../src/tools/insert-rows';
import * as googleAuth from '../../../src/utils/google-auth';
import * as errorHandler from '../../../src/utils/error-handler';
import * as rangeHelpers from '../../../src/utils/range-helpers';

vi.mock('../../../src/utils/google-auth');
vi.mock('../../../src/utils/error-handler');
vi.mock('../../../src/utils/range-helpers');

describe('handleInsertRows', () => {
  const mockSheets = {
    spreadsheets: {
      batchUpdate: vi.fn(),
      values: {
        update: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
    vi.mocked(rangeHelpers.extractSheetName).mockReturnValue({
      sheetName: 'Sheet1',
      range: 'A5',
    });
    vi.mocked(rangeHelpers.getSheetId).mockResolvedValue(0);
    vi.mocked(rangeHelpers.parseRange).mockReturnValue({
      sheetId: 0,
      startRowIndex: 4,
      endRowIndex: 5,
      startColumnIndex: 0,
      endColumnIndex: 1,
    } as any);
  });

  describe('basic row insertion', () => {
    it('should insert single row before specified position', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A5',
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      const result = await handleInsertRows(input);

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'ROWS',
                  startIndex: 4,
                  endIndex: 5,
                },
                inheritFromBefore: false,
              },
            },
          ],
        },
      });

      expect(result).toMatchObject({
        content: [
          expect.objectContaining({
            text: expect.stringContaining('Inserted 1 rows BEFORE row 5'),
          }),
        ],
      });
    });

    it('should insert multiple rows after specified position', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A10',
        rows: 3,
        position: 'AFTER',
      };

      vi.mocked(rangeHelpers.parseRange).mockReturnValue({
        sheetId: 0,
        startRowIndex: 9,
        endRowIndex: 10,
        startColumnIndex: 0,
        endColumnIndex: 1,
      } as any);

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      const result = await handleInsertRows(input);

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: 0,
                  dimension: 'ROWS',
                  startIndex: 10,
                  endIndex: 13,
                },
                inheritFromBefore: false,
              },
            },
          ],
        },
      });

      expect(result).toMatchObject({
        content: [
          expect.objectContaining({
            text: expect.stringContaining('Inserted 3 rows AFTER row 10'),
          }),
        ],
      });
    });

    it('should inherit formatting when specified', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A5',
        inheritFromBefore: true,
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      await handleInsertRows(input);

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            requests: [
              {
                insertDimension: {
                  range: expect.any(Object),
                  inheritFromBefore: true,
                },
              },
            ],
          },
        })
      );
    });
  });

  describe('row insertion with values', () => {
    it('should insert rows and populate with values', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A5',
        rows: 2,
        values: [
          ['John', 'Doe', 'john@example.com'],
          ['Jane', 'Smith', 'jane@example.com'],
        ],
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: {
          updatedCells: 6,
        },
      });

      const result = await handleInsertRows(input);

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalled();

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: "'Sheet1'!A5:C6",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: input.values,
        },
      });

      expect(result).toMatchObject({
        content: [
          expect.objectContaining({
            text: expect.stringContaining('updated 6 cells'),
          }),
        ],
      });
    });

    it('should use RAW value input option when specified', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A5',
        values: [['=SUM(A1:A4)']],
        valueInputOption: 'RAW',
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {},
      });

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: {},
      });

      await handleInsertRows(input);

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          valueInputOption: 'RAW',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors from batchUpdate', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A5',
      };

      const error = new Error('API Error');
      mockSheets.spreadsheets.batchUpdate.mockRejectedValue(error);
      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'Error occurred' }],
      } as any);

      const result = await handleInsertRows(input);

      expect(errorHandler.handleError).toHaveBeenCalledWith(error);
      expect(result).toMatchObject({
        content: [{ type: 'text', text: 'Error occurred' }],
      });
    });

    it('should handle errors from values update', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A5',
        values: [['test']],
      };

      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({ data: {} });
      const error = new Error('Update Error');
      mockSheets.spreadsheets.values.update.mockRejectedValue(error);
      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'Update failed' }],
      } as any);

      const result = await handleInsertRows(input);

      expect(errorHandler.handleError).toHaveBeenCalledWith(error);
      expect(result).toMatchObject({
        content: [{ type: 'text', text: 'Update failed' }],
      });
    });
  });
});