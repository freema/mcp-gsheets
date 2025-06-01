import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSheetsAPI, resetMocks, setupErrorResponse } from '../mocks/google-sheets';
import { createGoogleApiError } from '../helpers/test-utils';

// This is a sample integration test showing how to use the mocks
// Replace with actual tool imports when testing real tools

describe('Sample Integration Test', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  describe('successful operations', () => {
    it('should get values from spreadsheet', async () => {
      // Mock is already set up with default response
      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: 'test-id',
        range: 'A1:C3',
      });

      expect(result.data.values).toHaveLength(3);
      expect(result.data.range).toBe('Sheet1!A1:C3');
      expect(mockSheetsAPI.spreadsheets.values.get).toHaveBeenCalledOnce();
    });

    it('should update values in spreadsheet', async () => {
      const values = [['New', 'Data'], ['Row', '2']];
      
      const result = await mockSheetsAPI.spreadsheets.values.update({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        requestBody: { values },
      });

      expect(result.data.updatedCells).toBe(9);
      expect(mockSheetsAPI.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        range: 'A1:B2',
        requestBody: { values },
      });
    });

    it('should batch get values', async () => {
      const result = await mockSheetsAPI.spreadsheets.values.batchGet({
        spreadsheetId: 'test-id',
        ranges: ['A1:B2', 'C1:D2'],
      });

      expect(result.data.valueRanges).toHaveLength(2);
      expect(result.data.valueRanges[0].range).toBe('Sheet1!A1:B2');
      expect(result.data.valueRanges[1].range).toBe('Sheet2!C1:D2');
    });
  });

  describe('error handling', () => {
    it('should handle 404 not found error', async () => {
      const error = createGoogleApiError(404, 'Requested entity was not found');
      setupErrorResponse('spreadsheets.values.get', error);

      await expect(mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: 'non-existent',
        range: 'A1',
      })).rejects.toEqual(error);
    });

    it('should handle 403 permission denied error', async () => {
      const error = createGoogleApiError(403, 'The caller does not have permission');
      setupErrorResponse('spreadsheets.values.update', error);

      await expect(mockSheetsAPI.spreadsheets.values.update({
        spreadsheetId: 'test-id',
        range: 'A1',
        requestBody: { values: [['test']] },
      })).rejects.toEqual(error);
    });

    it('should handle 429 rate limit error', async () => {
      const error = createGoogleApiError(429, 'Quota exceeded');
      setupErrorResponse('spreadsheets.values.batchGet', error);

      await expect(mockSheetsAPI.spreadsheets.values.batchGet({
        spreadsheetId: 'test-id',
        ranges: ['A1'],
      })).rejects.toEqual(error);
    });
  });

  describe('custom mock responses', () => {
    it('should allow custom mock implementation', async () => {
      // Override default mock for specific test
      mockSheetsAPI.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          range: 'CustomSheet!X1:Z100',
          majorDimension: 'COLUMNS',
          values: Array(100).fill(['X', 'Y', 'Z']),
        },
      });

      const result = await mockSheetsAPI.spreadsheets.values.get({
        spreadsheetId: 'test-id',
        range: 'X1:Z100',
      });

      expect(result.data.majorDimension).toBe('COLUMNS');
      expect(result.data.values).toHaveLength(100);
    });

    it('should chain multiple custom responses', async () => {
      mockSheetsAPI.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: [['First']] } })
        .mockResolvedValueOnce({ data: { values: [['Second']] } })
        .mockResolvedValueOnce({ data: { values: [['Third']] } });

      const results = await Promise.all([
        mockSheetsAPI.spreadsheets.values.get({ spreadsheetId: 'id', range: 'A1' }),
        mockSheetsAPI.spreadsheets.values.get({ spreadsheetId: 'id', range: 'A2' }),
        mockSheetsAPI.spreadsheets.values.get({ spreadsheetId: 'id', range: 'A3' }),
      ]);

      expect(results[0].data.values[0][0]).toBe('First');
      expect(results[1].data.values[0][0]).toBe('Second');
      expect(results[2].data.values[0][0]).toBe('Third');
    });
  });
});