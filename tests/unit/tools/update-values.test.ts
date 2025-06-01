import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUpdateValues } from '../../../src/tools/update-values';
import * as googleAuth from '../../../src/utils/google-auth';
import * as errorHandler from '../../../src/utils/error-handler';

vi.mock('../../../src/utils/google-auth');
vi.mock('../../../src/utils/error-handler');

describe('handleUpdateValues', () => {
  const mockSheets = {
    spreadsheets: {
      values: {
        update: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  describe('range validation', () => {
    it('should accept flexible range with any number of rows', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A1',
        values: [
          ['Row 1'],
          ['Row 2'],
          ['Row 3'],
          ['Row 4'],
          ['Row 5'],
        ],
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: {
          updatedCells: 5,
          updatedRange: 'Sheet1!A1:A5',
        },
      });

      const result = await handleUpdateValues(input);
      
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: input.values,
        },
      });
      
      expect(result).toMatchObject({
        content: [
          expect.objectContaining({
            text: expect.stringContaining('5 cells'),
          }),
        ],
      });
    });

    it('should accept exact range when row count matches', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A1:B3',
        values: [
          ['A1', 'B1'],
          ['A2', 'B2'],
          ['A3', 'B3'],
        ],
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: {
          updatedCells: 6,
          updatedRange: 'Sheet1!A1:B3',
        },
      });

      const result = await handleUpdateValues(input);
      
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
      expect(result).toMatchObject({
        content: [
          expect.objectContaining({
            text: expect.stringContaining('6 cells'),
          }),
        ],
      });
    });

    it('should reject exact range when row count does not match', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A1:B3',
        values: [
          ['A1', 'B1'],
          ['A2', 'B2'],
          ['A3', 'B3'],
          ['A4', 'B4'],
          ['A5', 'B5'],
        ],
      };

      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'Error occurred' }],
        isError: true,
      });

      await handleUpdateValues(input);
      
      expect(errorHandler.handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Range mismatch'),
        })
      );
      
      const errorCall = vi.mocked(errorHandler.handleError).mock.calls[0][0];
      expect(errorCall.message).toContain('expects exactly 3 rows');
      expect(errorCall.message).toContain('but you provided 5 rows (including any empty rows)');
      expect(errorCall.message).toContain('Sheet1!A1:B5');
    });

    it('should provide helpful error message with suggestions', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Data!A42:E53',
        values: Array(33).fill(['Col1', 'Col2', 'Col3', 'Col4', 'Col5']),
      };

      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'Error occurred' }],
        isError: true,
      });

      await handleUpdateValues(input);
      
      const errorCall = vi.mocked(errorHandler.handleError).mock.calls[0][0];
      expect(errorCall.message).toContain('expects exactly 12 rows');
      expect(errorCall.message).toContain('but you provided 33 rows');
      expect(errorCall.message).toContain('Use a flexible range (e.g., "Data!A42")');
      expect(errorCall.message).toContain('Data!A42:E74');
    });

    it('should handle empty rows in data array', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'Sheet1!A1:B5',
        values: [
          ['Data 1', 'Data 2'],
          [],
          ['Data 3', 'Data 4'],
          [],
          ['Data 5', 'Data 6'],
        ],
      };

      mockSheets.spreadsheets.values.update.mockResolvedValue({
        data: {
          updatedCells: 10,
          updatedRange: 'Sheet1!A1:B5',
        },
      });

      const result = await handleUpdateValues(input);
      
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
      expect(result).toMatchObject({
        content: [
          expect.objectContaining({
            text: expect.stringContaining('10 cells'),
          }),
        ],
      });
    });

    it('should accept ranges without end specification', async () => {
      const testCases = [
        { range: 'A1', values: [[1], [2], [3]] },
        { range: 'Sheet1!B5', values: [['a'], ['b'], ['c'], ['d']] },
        { range: "'My Sheet'!C10", values: [['x'], ['y']] },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        
        mockSheets.spreadsheets.values.update.mockResolvedValue({
          data: {
            updatedCells: testCase.values.length,
            updatedRange: testCase.range,
          },
        });

        const result = await handleUpdateValues({
          spreadsheetId: 'test-id',
          ...testCase,
        });

        expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
        expect(result).toMatchObject({
          content: expect.any(Array),
        });
      }
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const input = {
        spreadsheetId: 'test-id',
        range: 'A1',
        values: [['test']],
      };

      const apiError = new Error('API Error');
      mockSheets.spreadsheets.values.update.mockRejectedValue(apiError);

      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'API Error' }],
        isError: true,
      });

      const result = await handleUpdateValues(input);

      expect(errorHandler.handleError).toHaveBeenCalledWith(apiError);
      expect(result).toMatchObject({
        isError: true,
      });
    });

    it('should handle validation errors', async () => {
      const input = {
        spreadsheetId: 'invalid id!',
        range: 'A1',
        values: [['test']],
      };

      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'Invalid spreadsheet ID format' }],
        isError: true,
      });

      const result = await handleUpdateValues(input);

      expect(errorHandler.handleError).toHaveBeenCalled();
      expect(result).toMatchObject({
        isError: true,
      });
    });
  });
});