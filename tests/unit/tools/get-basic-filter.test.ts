import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetBasicFilter } from '../../../src/tools/get-basic-filter.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetBasicFilter', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('should return filter info when a basic filter exists', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
            basicFilter: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 10,
                startColumnIndex: 0,
                endColumnIndex: 3,
              },
              sortSpecs: [{ dimensionIndex: 1, sortOrder: 'ASCENDING' }],
              filterSpecs: [
                {
                  columnIndex: 0,
                  filterCriteria: {
                    hiddenValues: ['hidden1'],
                    condition: { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: 'test' }] },
                  },
                },
              ],
            },
          },
        ],
      },
    });

    const result = await handleGetBasicFilter({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    expect(text).toContain('hasBasicFilter');
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.hasBasicFilter).toBe(true);
    expect(parsed.basicFilter.filterCriteria).toHaveLength(1);
    expect(parsed.basicFilter.filterCriteria[0].columnLetter).toBe('A');
    expect(parsed.basicFilter.filterCriteria[0].hiddenValues).toEqual(['hidden1']);
    expect(parsed.basicFilter.sortSpecs).toHaveLength(1);
    expect(parsed.basicFilter.sortSpecs[0].sortOrder).toBe('ASCENDING');
  });

  it('should return hasBasicFilter false when no filter exists', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
          },
        ],
      },
    });

    const result = await handleGetBasicFilter({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.hasBasicFilter).toBe(false);
  });

  it('should handle legacy criteria format', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
            basicFilter: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 5,
                startColumnIndex: 0,
                endColumnIndex: 2,
              },
              criteria: {
                '1': {
                  hiddenValues: ['val1', 'val2'],
                },
              },
            },
          },
        ],
      },
    });

    const result = await handleGetBasicFilter({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.hasBasicFilter).toBe(true);
    expect(parsed.basicFilter.filterCriteria).toHaveLength(1);
    expect(parsed.basicFilter.filterCriteria[0].columnIndex).toBe(1);
    expect(parsed.basicFilter.filterCriteria[0].columnLetter).toBe('B');
  });

  it('should throw when sheet is not found', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [{ properties: { title: 'Other', sheetId: 1 } }],
      },
    });

    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: Sheet "Sheet1" not found. Available: Other' }],
    } as any);

    const result = await handleGetBasicFilter({
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

    const result = await handleGetBasicFilter({ sheetName: 'Sheet1' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('should fail validation when sheetName is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    const result = await handleGetBasicFilter({ spreadsheetId: 'test-id' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
