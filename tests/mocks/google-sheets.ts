import { vi } from 'vitest';

export const mockSheetsAPI = {
  spreadsheets: {
    get: vi.fn().mockReturnValue({
      data: {
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        properties: {
          title: 'Test Spreadsheet',
          locale: 'en_US',
          timeZone: 'America/New_York',
        },
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: 'Sheet1',
              index: 0,
              gridProperties: {
                rowCount: 1000,
                columnCount: 26,
              },
            },
          },
        ],
      },
    }),
    create: vi.fn().mockReturnValue({
      data: {
        spreadsheetId: 'new-spreadsheet-id-123',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-spreadsheet-id-123/edit',
        properties: {
          title: 'New Test Spreadsheet',
        },
      },
    }),
    batchUpdate: vi.fn().mockReturnValue({
      data: {
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        replies: [{}],
      },
    }),
    values: {
      get: vi.fn().mockReturnValue({
        data: {
          range: 'Sheet1!A1:C3',
          majorDimension: 'ROWS',
          values: [
            ['A1', 'B1', 'C1'],
            ['A2', 'B2', 'C2'],
            ['A3', 'B3', 'C3'],
          ],
        },
      }),
      update: vi.fn().mockReturnValue({
        data: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          updatedRange: 'Sheet1!A1:C3',
          updatedRows: 3,
          updatedColumns: 3,
          updatedCells: 9,
        },
      }),
      append: vi.fn().mockReturnValue({
        data: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          tableRange: 'Sheet1!A1:C10',
          updates: {
            spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
            updatedRange: 'Sheet1!A11:C13',
            updatedRows: 3,
            updatedColumns: 3,
            updatedCells: 9,
          },
        },
      }),
      clear: vi.fn().mockReturnValue({
        data: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          clearedRange: 'Sheet1!A1:C3',
        },
      }),
      batchGet: vi.fn().mockReturnValue({
        data: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          valueRanges: [
            {
              range: 'Sheet1!A1:B2',
              majorDimension: 'ROWS',
              values: [
                ['A1', 'B1'],
                ['A2', 'B2'],
              ],
            },
            {
              range: 'Sheet2!C1:D2',
              majorDimension: 'ROWS',
              values: [
                ['C1', 'D1'],
                ['C2', 'D2'],
              ],
            },
          ],
        },
      }),
      batchUpdate: vi.fn().mockReturnValue({
        data: {
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          totalUpdatedRows: 6,
          totalUpdatedColumns: 4,
          totalUpdatedCells: 24,
          totalUpdatedSheets: 2,
          responses: [
            {
              updatedRange: 'Sheet1!A1:B2',
              updatedRows: 2,
              updatedColumns: 2,
              updatedCells: 4,
            },
            {
              updatedRange: 'Sheet2!C1:D2',
              updatedRows: 2,
              updatedColumns: 2,
              updatedCells: 4,
            },
          ],
        },
      }),
    },
  },
};

export const mockGoogleAuth = {
  getClient: vi.fn().mockResolvedValue({}),
};

export const mockGoogleAPIs = {
  sheets: vi.fn().mockReturnValue(mockSheetsAPI),
  auth: {
    GoogleAuth: vi.fn().mockImplementation(() => mockGoogleAuth),
  },
};

// Helper to reset all mocks
export function resetMocks() {
  Object.values(mockSheetsAPI.spreadsheets).forEach((mock) => {
    if (typeof mock === 'function' && typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
  Object.values(mockSheetsAPI.spreadsheets.values).forEach((mock) => {
    if (typeof mock === 'function' && typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
}

// Helper to setup error responses
export function setupErrorResponse(method: string, error: any) {
  const parts = method.split('.');
  let target = mockSheetsAPI;
  
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
  }
  
  target[parts[parts.length - 1]].mockRejectedValueOnce(error);
}