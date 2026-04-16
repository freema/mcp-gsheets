import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleGetMergedCells } from '../../../src/tools/get-merged-cells.js';
import * as googleAuth from '../../../src/utils/google-auth.js';
import * as errorHandler from '../../../src/utils/error-handler.js';

vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/error-handler.js');

describe('handleGetMergedCells', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  it('should return merged cell ranges', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
            merges: [
              {
                startRowIndex: 0,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 3,
              },
              {
                startRowIndex: 5,
                endRowIndex: 8,
                startColumnIndex: 1,
                endColumnIndex: 4,
              },
            ],
          },
        ],
      },
    });

    const result = await handleGetMergedCells({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.mergeCount).toBe(2);
    expect(parsed.merges).toHaveLength(2);
    expect(parsed.merges[0].a1Notation).toBe('A1:C2');
    expect(parsed.merges[0].startRowIndex).toBe(0);
    expect(parsed.merges[0].endRowIndex).toBe(2);
    expect(parsed.merges[1].a1Notation).toBe('B6:D8');
    expect(parsed.sheetId).toBe(0);
  });

  it('should return zero merges when none exist', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [
          {
            properties: { title: 'Sheet1', sheetId: 0 },
          },
        ],
      },
    });

    const result = await handleGetMergedCells({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    const text = result.content[0].text;
    const parsed = JSON.parse(text.split('\n\n')[1]);
    expect(parsed.mergeCount).toBe(0);
    expect(parsed.merges).toEqual([]);
  });

  it('should throw when sheet is not found', async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: {
        sheets: [{ properties: { title: 'Other', sheetId: 1 } }],
      },
    });

    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: Sheet "Sheet1" not found' }],
    } as any);

    const result = await handleGetMergedCells({
      spreadsheetId: 'test-id',
      sheetName: 'Sheet1',
    });

    expect(errorHandler.handleError).toHaveBeenCalled();
    expect(result.content[0].text).toContain('Error');
  });

  it('should fail validation when sheetName is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetMergedCells({ spreadsheetId: 'test-id' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });

  it('should fail validation when spreadsheetId is missing', async () => {
    vi.mocked(errorHandler.handleError).mockReturnValue({
      content: [{ type: 'text', text: 'Error: validation' }],
    } as any);

    await handleGetMergedCells({ sheetName: 'Sheet1' });

    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
