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

  describe('JSON string inputs', () => {
    it('should parse JSON string for position', async () => {
      const positionObj = {
        overlayPosition: { anchorCell: { sheetId: 123, rowIndex: 0, columnIndex: 5 } },
      };
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: JSON.stringify(positionObj),
        chartType: 'LINE',
        series: [{ sourceRange: 'B1:B5' }],
      };

      mockValidateCreateChartInput.mockReturnValue({ ...input, position: positionObj });
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 1 } } }] },
      });

      const result = await handleCreateChart(input);
      expect(result.content).toBeDefined();
    });

    it('should parse JSON strings for backgroundColor, legend, domainAxis, leftAxis, rightAxis', async () => {
      const baseInput = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'COLUMN',
        series: [{ sourceRange: 'B1:B5' }],
        backgroundColor: JSON.stringify({ red: 1, green: 1, blue: 1 }),
        legend: JSON.stringify({ position: 'BOTTOM_LEGEND' }),
        domainAxis: JSON.stringify({ title: 'X' }),
        leftAxis: JSON.stringify({ title: 'Y' }),
        rightAxis: JSON.stringify({ title: 'Y2' }),
      };

      mockValidateCreateChartInput.mockReturnValue({
        ...baseInput,
        backgroundColor: { red: 1, green: 1, blue: 1 },
        legend: { position: 'BOTTOM_LEGEND' },
        domainAxis: { title: 'X' },
        leftAxis: { title: 'Y' },
        rightAxis: { title: 'Y2' },
      });
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 2 } } }] },
      });

      const result = await handleCreateChart(baseInput);
      expect(result.content).toBeDefined();
    });
  });

  describe('default chart type (COMBO/HISTOGRAM)', () => {
    it('should use basicChart with chartType in default switch case', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'COMBO',
        series: [{ sourceRange: 'B1:B5' }],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 3 } } }] },
      });

      const result = await handleCreateChart(input);

      expect(result.content[0].text).toContain('COMBO');
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            requests: [
              expect.objectContaining({
                addChart: expect.objectContaining({
                  chart: expect.objectContaining({
                    spec: expect.objectContaining({
                      basicChart: expect.objectContaining({ chartType: 'COMBO' }),
                    }),
                  }),
                }),
              }),
            ],
          }),
        })
      );
    });
  });

  describe('PIE chart where domain match is null', () => {
    it('should skip pieChart.domain when range has no row bounds', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'PIE',
        series: [{ sourceRange: 'Sheet1!B1:B' }],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      // extractSheetName returns a range that doesn't match /[A-Z]+(\d+):[A-Z]+(\d+)/
      mockExtractSheetName.mockReturnValue({ sheetName: null, range: 'B:B' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 4 } } }] },
      });

      const result = await handleCreateChart(input);
      expect(result.content[0].text).toContain('PIE');
    });
  });

  describe('NO_LEGEND position branch', () => {
    it('should use NO_LEGEND directly when position is NO_LEGEND', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'LINE',
        series: [{ sourceRange: 'B1:B5' }],
        legend: { position: 'NO_LEGEND' },
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 5 } } }] },
      });

      const result = await handleCreateChart(input);

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            requests: [
              expect.objectContaining({
                addChart: expect.objectContaining({
                  chart: expect.objectContaining({
                    spec: expect.objectContaining({
                      basicChart: expect.objectContaining({ legendPosition: 'NO_LEGEND' }),
                    }),
                  }),
                }),
              }),
            ],
          }),
        })
      );
    });

    it('should use position directly when already has _LEGEND suffix', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'LINE',
        series: [{ sourceRange: 'B1:B5' }],
        legend: { position: 'LEFT_LEGEND' },
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 6 } } }] },
      });

      const result = await handleCreateChart(input);

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            requests: [
              expect.objectContaining({
                addChart: expect.objectContaining({
                  chart: expect.objectContaining({
                    spec: expect.objectContaining({
                      basicChart: expect.objectContaining({ legendPosition: 'LEFT_LEGEND' }),
                    }),
                  }),
                }),
              }),
            ],
          }),
        })
      );
    });
  });

  describe('basicChart domain auto-detect with no row bounds in range', () => {
    it('should skip domain when range has no row numbers (match is null)', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'COLUMN',
        series: [{ sourceRange: 'B:B' }],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      // Return a range without row numbers → match will be null
      mockExtractSheetName.mockReturnValue({ sheetName: null, range: 'B:B' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 8 } } }] },
      });

      const result = await handleCreateChart(input);
      expect(result.content[0].text).toContain('COLUMN');
    });
  });

  describe('PIE chart with empty series (else-if false path)', () => {
    it('should skip series setup when PIE chart has no series', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'PIE',
        series: [],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 9 } } }] },
      });

      const result = await handleCreateChart(input);
      expect(result.content[0].text).toContain('PIE');
    });
  });

  describe('domainRange without sheet prefix (uses actualSheetId)', () => {
    it('should use actualSheetId when domainRange extractSheetName returns no sheetName', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'COLUMN',
        series: [{ sourceRange: 'B1:B5' }],
        domainRange: 'A1:A5',
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      // extractSheetName is called 3x: (1) init firstSeriesRange, (2) series loop, (3) domainRange
      mockExtractSheetName
        .mockReturnValueOnce({ sheetName: null, range: 'B1:B5' })
        .mockReturnValueOnce({ sheetName: null, range: 'B1:B5' })
        .mockReturnValueOnce({ sheetName: null, range: 'A1:A5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { spreadsheetId: 'test-spreadsheet-id', replies: [{ addChart: { chart: { chartId: 5 } } }] },
      });

      const result = await handleCreateChart(input);
      expect(result.content[0].text).toContain('COLUMN');
      expect(mockGetSheetId).not.toHaveBeenCalled();
    });
  });

  describe('batchUpdate response with null replies', () => {
    it('should return empty updatedReplies when response.data.replies is null', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'COLUMN',
        series: [{ sourceRange: 'B1:B5' }],
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ sheetName: null, range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { spreadsheetId: 'test-spreadsheet-id', replies: null },
      });

      const result = await handleCreateChart(input);
      expect(result.content[0].text).toContain('COLUMN');
    });
  });

  describe('Axis configuration', () => {
    it('should add domain, left, and right axes when all titles are provided', async () => {
      const input = {
        spreadsheetId: 'test-spreadsheet-id',
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 } } },
        chartType: 'LINE',
        series: [{ sourceRange: 'B1:B5' }],
        domainAxis: { title: 'Time' },
        leftAxis: { title: 'Value' },
        rightAxis: { title: 'Count' },
        altText: 'A line chart',
        backgroundColor: { red: 1, green: 1, blue: 1 },
      };

      mockValidateCreateChartInput.mockReturnValue(input);
      mockExtractSheetName.mockReturnValue({ range: 'B1:B5' });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { replies: [{ addChart: { chart: { chartId: 7 } } }] },
      });

      const result = await handleCreateChart(input);

      expect(result.content).toBeDefined();
      const batchUpdateCall = mockSheets.spreadsheets.batchUpdate.mock.calls[0][0];
      const chartSpec = batchUpdateCall.requestBody.requests[0].addChart.chart.spec;
      expect(chartSpec.basicChart.axis).toHaveLength(3);
      expect(chartSpec.altText).toBe('A line chart');
      expect(chartSpec.backgroundColor).toEqual({ red: 1, green: 1, blue: 1 });
    });
  });
});