import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCreateChart } from '../../../src/tools/create-chart.js';
import { getAuthenticatedClient } from '../../../src/utils/google-auth.js';
import { validateCreateChartInput } from '../../../src/utils/validators.js';
import { getSheetId, extractSheetName, parseRange } from '../../../src/utils/range-helpers.js';

// Mock dependencies
vi.mock('../../../src/utils/google-auth.js');
vi.mock('../../../src/utils/validators.js');
vi.mock('../../../src/utils/range-helpers.js');

const mockSheets = {
  spreadsheets: {
    batchUpdate: vi.fn(),
    get: vi.fn(),
  },
};

const mockGetAuthenticatedClient = vi.mocked(getAuthenticatedClient);
const mockValidateCreateChartInput = vi.mocked(validateCreateChartInput);
const mockGetSheetId = vi.mocked(getSheetId);
const mockExtractSheetName = vi.mocked(extractSheetName);
const mockParseRange = vi.mocked(parseRange);

describe('handleCreateChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedClient.mockResolvedValue(mockSheets as any);
    mockGetSheetId.mockResolvedValue(123);
    mockExtractSheetName.mockReturnValue({ sheetName: 'Sheet1', range: 'A1:B5' });
    mockParseRange.mockReturnValue({
      sheetId: 123,
      startRowIndex: 0,
      endRowIndex: 5,
      startColumnIndex: 0,
      endColumnIndex: 2,
    });
  });

  describe('Basic Chart Creation', () => {
    it('should create a column chart successfully', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'COLUMN',
        title: 'Test Column Chart',
        series: [
          {
            sourceRange: 'Sheet1!B1:B5',
          },
        ],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          replies: [{ addChart: { chart: { chartId: 456 } } }],
        },
      });

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Successfully created COLUMN chart');
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        requestBody: {
          requests: [
            {
              addChart: {
                chart: {
                  spec: expect.objectContaining({
                    title: 'Test Column Chart',
                    basicChart: expect.objectContaining({
                      chartType: 'COLUMN',
                      legendPosition: 'BOTTOM_LEGEND',
                    }),
                  }),
                  position: input.position,
                },
              },
            },
          ],
        },
      });
    });

    it('should create a pie chart successfully', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'PIE',
        title: 'Test Pie Chart',
        series: [
          {
            sourceRange: 'Sheet1!B1:B5',
          },
        ],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          replies: [{ addChart: { chart: { chartId: 789 } } }],
        },
      });

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Successfully created PIE chart');
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-spreadsheet-id',
        requestBody: {
          requests: [
            {
              addChart: {
                chart: {
                  spec: expect.objectContaining({
                    title: 'Test Pie Chart',
                    pieChart: expect.objectContaining({
                      legendPosition: 'BOTTOM_LEGEND',
                    }),
                  }),
                  position: input.position,
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('Chart Types', () => {
    const chartTypes = ['COLUMN', 'BAR', 'LINE', 'AREA', 'SCATTER'] as const;

    chartTypes.forEach((chartType) => {
      it(`should create ${chartType} chart with correct configuration`, async () => {
        const input = {
          spreadsheetId: 'test-spreadsheet-id',
          position: {
            overlayPosition: {
              anchorCell: {
                sheetId: 123,
                rowIndex: 0,
                columnIndex: 5,
              },
            },
          },
          chartType,
          series: [
            {
              sourceRange: 'A1:B5',
            },
          ],
        };

        mockValidateCreateChartInput.mockReturnValue(input);
        mockExtractSheetName.mockReturnValue({ range: 'A1:B5' });
        mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
          data: {
            spreadsheetId: 'test-spreadsheet-id',
            replies: [{ addChart: { chart: { chartId: 999 } } }],
          },
        });

        const result = await handleCreateChart(input);

        expect(result.content).toBeDefined();
        expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            requestBody: {
              requests: [
                {
                  addChart: {
                    chart: {
                      spec: expect.objectContaining({
                        basicChart: expect.objectContaining({
                          chartType,
                        }),
                      }),
                      position: input.position,
                    },
                  },
                },
              ],
            },
          })
        );
      });
    });
  });

  describe('Sheet Name Handling', () => {
    it('should handle quoted sheet names in series ranges', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'COLUMN',
        series: [
          {
            sourceRange: "'My Sheet'!B1:B5",
          },
        ],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ sheetName: 'My Sheet', range: 'B1:B5' });
      mockGetSheetId.mockResolvedValue(456);
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          replies: [{ addChart: { chart: { chartId: 789 } } }],
        },
      });

      await handleCreateChart(input);

      expect(mockExtractSheetName).toHaveBeenCalledWith("'My Sheet'!B1:B5");
      expect(mockGetSheetId).toHaveBeenCalledWith(mockSheets, 'test-spreadsheet-id', 'My Sheet');
      expect(mockParseRange).toHaveBeenCalledWith('B1:B5', 456);
    });

    it('should handle domain range with sheet names', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'COLUMN',
        series: [
          {
            sourceRange: 'B1:B5',
          },
        ],
        domainRange: 'Data!A1:A5',
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName
        .mockReturnValueOnce({ range: 'B1:B5' })
        .mockReturnValueOnce({ sheetName: 'Data', range: 'A1:A5' });
      mockGetSheetId.mockResolvedValue(789);
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          replies: [{ addChart: { chart: { chartId: 999 } } }],
        },
      });

      await handleCreateChart(input);

      expect(mockExtractSheetName).toHaveBeenCalledWith('Data!A1:A5');
      expect(mockGetSheetId).toHaveBeenCalledWith(mockSheets, 'test-spreadsheet-id', 'Data');
    });
  });

  describe('Multiple Series', () => {
    it('should handle multiple series with different target axes', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'COLUMN',
        series: [
          {
            sourceRange: 'B1:B5',
            targetAxis: 'LEFT_AXIS',
          },
          {
            sourceRange: 'C1:C5',
            targetAxis: 'RIGHT_AXIS',
          },
        ],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          replies: [{ addChart: { chart: { chartId: 111 } } }],
        },
      });

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      expect(mockParseRange).toHaveBeenCalledTimes(3); // 2 series + 1 domain
    });
  });

  describe('Legend Configuration', () => {
    it('should handle legend position without _LEGEND suffix', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'COLUMN',
        series: [
          {
            sourceRange: 'B1:B5',
          },
        ],
        legend: {
          position: 'TOP',
        },
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          replies: [{ addChart: { chart: { chartId: 333 } } }],
        },
      });

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            requests: [
              {
                addChart: {
                  chart: {
                    spec: expect.objectContaining({
                      basicChart: expect.objectContaining({
                        legendPosition: 'TOP_LEGEND',
                      }),
                    }),
                    position: input.position,
                  },
                },
              },
            ],
          },
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        // Missing required position field
        chartType: 'COLUMN',
        series: [],
      };

      mockValidateCreateChartInput.mockImplementation(() => {
        throw new Error('Missing required field: position');
      });

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Missing required field: position');
    });

    it('should handle sheets API errors', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'COLUMN',
        series: [
          {
            sourceRange: 'B1:B5',
          },
        ],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockRejectedValue(new Error('API quota exceeded'));

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('API quota exceeded');
    });

  });

  describe('Chart Styling', () => {
    it('should set chart title and subtitle', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: {
          overlayPosition: {
            anchorCell: {
              sheetId: 123,
              rowIndex: 0,
              columnIndex: 5,
            },
          },
        },
        chartType: 'COLUMN',
        title: 'Chart Title',
        subtitle: 'Chart Subtitle',
        series: [
          {
            sourceRange: 'B1:B5',
          },
        ],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-spreadsheet-id',
          replies: [{ addChart: { chart: { chartId: 666 } } }],
        },
      });

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: {
            requests: [
              {
                addChart: {
                  chart: {
                    spec: expect.objectContaining({
                      title: 'Chart Title',
                      subtitle: 'Chart Subtitle',
                    }),
                    position: input.position,
                  },
                },
              },
            ],
          },
        })
      );
    });
  });
});