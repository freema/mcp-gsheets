import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetDataValidation } from '../../../src/tools/get-data-validation.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetDataValidation', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('should return validation rules for a sheet with data validation', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: [
                      {
                        dataValidation: {
                          condition: {
                            type: 'ONE_OF_LIST',
                            values: [
                              { userEnteredValue: 'Yes' },
                              { userEnteredValue: 'No' },
                            ],
                          },
                          strict: true,
                          showCustomUi: true,
                        },
                      },
                      {
                        dataValidation: {
                          condition: {
                            type: 'ONE_OF_LIST',
                            values: [
                              { userEnteredValue: 'Yes' },
                              { userEnteredValue: 'No' },
                            ],
                          },
                          strict: true,
                          showCustomUi: true,
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

    const result = await handleGetDataValidation({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.validationRules).toHaveLength(1);
    expect(parsed.validationRules[0].type).toBe('ONE_OF_LIST');
    expect(parsed.validationRules[0].values).toEqual(['Yes', 'No']);
    expect(parsed.validationRules[0].ranges.length).toBeGreaterThan(0);
  });

  it('should return empty rules when no validation exists', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
            data: [{ rowData: [{ values: [{}] }] }],
          },
        ],
      },
    });

    const result = await handleGetDataValidation({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.validationRules).toHaveLength(0);
  });

  it('should return empty rules when no rowData exists', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
            data: [{}],
          },
        ],
      },
    });

    const result = await handleGetDataValidation({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.validationRules).toEqual([]);
  });

  it('should accept an optional range parameter', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
            data: [{ startRow: 0, startColumn: 0, rowData: [] }],
          },
        ],
      },
    });

    await handleGetDataValidation({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
      range: 'A1:D10',
    });

    expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith(
      expect.objectContaining({
        ranges: ['Sheet1!A1:D10'],
      })
    );
  });

  it('should throw when sheet is not found', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [{ properties: { title: 'Other', sheetId: 1 } }],
      },
    });

    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: Sheet not found' }],
    } as any);

    const result = await handleGetDataValidation({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
    expect(result.content[0].text).toContain('Error');
  });

  it('should fail validation when spreadsheetId is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetDataValidation({ sheetName: 'Sheet1' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
