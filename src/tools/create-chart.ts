import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateCreateChartInput } from '../utils/validators.js';
import { formatToolResponse } from '../utils/formatters.js';
import { parseJsonInput } from '../utils/json-parser.js';
import { parseRange, extractSheetName, getSheetId } from '../utils/range-helpers.js';
import { ToolResponse } from '../types/tools.js';

export const createChartTool: Tool = {
  name: 'sheets_create_chart',
  description:
    'Create a chart in a Google Sheets spreadsheet. Sheet names with spaces should be quoted in ranges (e.g., "My Sheet"!A1:B5). Position uses overlayPosition with anchorCell containing sheetId, rowIndex, and columnIndex.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      position: {
        type: 'object',
        description:
          'Chart position settings with overlay position. Use overlayPosition.anchorCell.sheetId to specify the sheet.',
        properties: {
          overlayPosition: {
            type: 'object',
            properties: {
              anchorCell: {
                type: 'object',
                properties: {
                  sheetId: {
                    type: 'number',
                    description: 'ID of the sheet where the chart will be placed',
                  },
                  rowIndex: {
                    type: 'number',
                    description: 'Row index (0-based) for chart position',
                  },
                  columnIndex: {
                    type: 'number',
                    description: 'Column index (0-based) for chart position',
                  },
                },
                required: ['sheetId', 'rowIndex', 'columnIndex'],
              },
              offsetXPixels: {
                type: 'number',
                description: 'Horizontal offset in pixels from anchor cell',
              },
              offsetYPixels: {
                type: 'number',
                description: 'Vertical offset in pixels from anchor cell',
              },
              widthPixels: {
                type: 'number',
                description: 'Chart width in pixels',
              },
              heightPixels: {
                type: 'number',
                description: 'Chart height in pixels',
              },
            },
            required: ['anchorCell'],
          },
        },
        required: ['overlayPosition'],
      },
      chartType: {
        type: 'string',
        enum: [
          'COLUMN',
          'BAR',
          'LINE',
          'AREA',
          'PIE',
          'SCATTER',
          'COMBO',
          'HISTOGRAM',
          'CANDLESTICK',
          'WATERFALL',
        ],
        description: 'Type of chart to create',
      },
      title: {
        type: 'string',
        description: 'Chart title (optional)',
      },
      subtitle: {
        type: 'string',
        description: 'Chart subtitle (optional)',
      },
      series: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sourceRange: {
              type: 'string',
              description:
                'Data range for this series in A1 notation. Use quotes for sheet names with spaces: "My Sheet"!B2:B5',
            },
            type: {
              type: 'string',
              enum: ['COLUMN', 'BAR', 'LINE', 'AREA', 'PIE', 'SCATTER'],
              description: 'Chart type for this series (for combo charts)',
            },
            targetAxis: {
              type: 'string',
              enum: ['LEFT_AXIS', 'RIGHT_AXIS'],
              description: 'Which axis this series should use',
            },
          },
          required: ['sourceRange'],
        },
        description: 'Array of data series for the chart',
      },
      domainRange: {
        type: 'string',
        description:
          'Optional domain range in A1 notation (e.g., "A2:A5" or "My Sheet"!A2:A5). If not provided, column A will be used',
      },
      domainAxis: {
        type: 'object',
        description: 'Domain (X) axis configuration',
      },
      leftAxis: {
        type: 'object',
        description: 'Left (Y) axis configuration',
      },
      rightAxis: {
        type: 'object',
        description: 'Right (Y) axis configuration',
      },
      legend: {
        type: 'object',
        description: 'Legend configuration',
      },
      backgroundColor: {
        type: 'object',
        description: 'Chart background color',
      },
      altText: {
        type: 'string',
        description: 'Alternative text for accessibility',
      },
    },
    required: ['spreadsheetId', 'position', 'chartType', 'series'],
  },
};

export async function handleCreateChart(input: any): Promise<ToolResponse> {
  try {
    // Handle JSON strings for complex objects
    if (typeof input.position === 'string') {
      input.position = parseJsonInput(input.position, 'position');
    }
    if (typeof input.backgroundColor === 'string') {
      input.backgroundColor = parseJsonInput(input.backgroundColor, 'backgroundColor');
    }
    if (typeof input.legend === 'string') {
      input.legend = parseJsonInput(input.legend, 'legend');
    }
    if (typeof input.domainAxis === 'string') {
      input.domainAxis = parseJsonInput(input.domainAxis, 'domainAxis');
    }
    if (typeof input.leftAxis === 'string') {
      input.leftAxis = parseJsonInput(input.leftAxis, 'leftAxis');
    }
    if (typeof input.rightAxis === 'string') {
      input.rightAxis = parseJsonInput(input.rightAxis, 'rightAxis');
    }

    const validatedInput = validateCreateChartInput(input);
    const sheets = await getAuthenticatedClient();

    // Build the chart spec
    const chartSpec: sheets_v4.Schema$ChartSpec = {};

    if (validatedInput.title !== undefined) {
      chartSpec.title = validatedInput.title;
    }
    if (validatedInput.subtitle !== undefined) {
      chartSpec.subtitle = validatedInput.subtitle;
    }
    if (validatedInput.backgroundColor !== undefined) {
      chartSpec.backgroundColor = validatedInput.backgroundColor;
    }
    if (validatedInput.altText !== undefined) {
      chartSpec.altText = validatedInput.altText;
    }

    // Validate and fix legend position
    let legendPosition = 'BOTTOM_LEGEND';
    if (validatedInput.legend?.position) {
      // Handle cases where position is passed without _LEGEND suffix
      const pos = validatedInput.legend.position;
      if (!pos.endsWith('_LEGEND') && pos !== 'NO_LEGEND') {
        legendPosition = `${pos}_LEGEND`;
      } else {
        legendPosition = pos;
      }
    }

    // Set chart type and build basic spec
    switch (validatedInput.chartType) {
      case 'COLUMN':
        chartSpec.basicChart = {
          chartType: 'COLUMN',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'BAR':
        chartSpec.basicChart = {
          chartType: 'BAR',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'LINE':
        chartSpec.basicChart = {
          chartType: 'LINE',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'AREA':
        chartSpec.basicChart = {
          chartType: 'AREA',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      case 'PIE':
        chartSpec.pieChart = {
          legendPosition: legendPosition,
          domain: {},
          series: {},
        };
        break;
      case 'SCATTER':
        chartSpec.basicChart = {
          chartType: 'SCATTER',
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
        break;
      default:
        chartSpec.basicChart = {
          chartType: validatedInput.chartType as any,
          legendPosition: legendPosition,
          axis: [],
          domains: [],
          series: [],
        };
    }

    // Add axis configuration if provided
    if (chartSpec.basicChart) {
      const axes: sheets_v4.Schema$BasicChartAxis[] = [];

      if (validatedInput.domainAxis?.title) {
        const axis: sheets_v4.Schema$BasicChartAxis = {
          position: 'BOTTOM_AXIS',
        };
        if (validatedInput.domainAxis.title !== undefined) {
          axis.title = validatedInput.domainAxis.title;
        }
        axes.push(axis);
      }

      if (validatedInput.leftAxis?.title) {
        const axis: sheets_v4.Schema$BasicChartAxis = {
          position: 'LEFT_AXIS',
        };
        if (validatedInput.leftAxis.title !== undefined) {
          axis.title = validatedInput.leftAxis.title;
        }
        axes.push(axis);
      }

      if (validatedInput.rightAxis?.title) {
        const axis: sheets_v4.Schema$BasicChartAxis = {
          position: 'RIGHT_AXIS',
        };
        if (validatedInput.rightAxis.title !== undefined) {
          axis.title = validatedInput.rightAxis.title;
        }
        axes.push(axis);
      }

      if (axes.length > 0) {
        chartSpec.basicChart.axis = axes;
      }
    }

    // Parse series data and get proper grid ranges
    if (
      chartSpec.basicChart &&
      validatedInput.chartType !== 'PIE' &&
      validatedInput.series.length > 0
    ) {
      // First, we need to identify domain (usually first column)
      // For now, we'll assume domain is in the same sheet as first series
      const firstSeries = validatedInput.series[0];
      if (!firstSeries) {
        throw new Error('At least one series is required');
      }
      const firstSeriesRange = firstSeries.sourceRange;
      const { sheetName } = extractSheetName(firstSeriesRange);

      // If we have a sheet name from the range, use it instead of the position anchor cell sheetId
      let actualSheetId = validatedInput.position.overlayPosition.anchorCell.sheetId;
      if (sheetName) {
        actualSheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);
      }

      // Parse each series
      for (const series of validatedInput.series) {
        const { sheetName: seriesSheetName, range: cleanRange } = extractSheetName(
          series.sourceRange
        );
        const seriesSheetId = seriesSheetName
          ? await getSheetId(sheets, validatedInput.spreadsheetId, seriesSheetName)
          : actualSheetId;

        const gridRange = parseRange(cleanRange, seriesSheetId);

        chartSpec.basicChart.series!.push({
          series: {
            sourceRange: {
              sources: [gridRange],
            },
          },
          targetAxis: series.targetAxis || 'LEFT_AXIS',
          type: series.type || validatedInput.chartType,
        });
      }

      // Add domain
      if (validatedInput.domainRange) {
        // Use provided domain range
        const { sheetName: domainSheetName, range: domainCleanRange } = extractSheetName(
          validatedInput.domainRange
        );
        const domainSheetId = domainSheetName
          ? await getSheetId(sheets, validatedInput.spreadsheetId, domainSheetName)
          : actualSheetId;

        const domainGridRange = parseRange(domainCleanRange, domainSheetId);

        chartSpec.basicChart.domains = [
          {
            domain: {
              sourceRange: {
                sources: [domainGridRange],
              },
            },
          },
        ];
      } else {
        // Auto-detect domain from first series range
        const { sheetName: domainSheetName, range: domainCleanRange } =
          extractSheetName(firstSeriesRange);
        const domainSheetId = domainSheetName
          ? await getSheetId(sheets, validatedInput.spreadsheetId, domainSheetName)
          : actualSheetId;

        // Extract row range from first series to create domain range
        const match = domainCleanRange.match(/[A-Z]+(\d+):[A-Z]+(\d+)/);
        if (match) {
          const domainRange = `A${match[1]}:A${match[2]}`;
          const domainGridRange = parseRange(domainRange, domainSheetId);

          chartSpec.basicChart.domains = [
            {
              domain: {
                sourceRange: {
                  sources: [domainGridRange],
                },
              },
            },
          ];
        }
      }
    } else if (
      chartSpec.pieChart &&
      validatedInput.chartType === 'PIE' &&
      validatedInput.series.length > 0
    ) {
      // For pie charts, parse the first series range
      const firstSeries = validatedInput.series[0];
      if (!firstSeries) {
        throw new Error('At least one series is required for pie chart');
      }
      const { sheetName, range: cleanRange } = extractSheetName(firstSeries.sourceRange);
      const seriesSheetId = sheetName
        ? await getSheetId(sheets, validatedInput.spreadsheetId, sheetName)
        : validatedInput.position.overlayPosition.anchorCell.sheetId;

      const gridRange = parseRange(cleanRange, seriesSheetId);

      chartSpec.pieChart.series = {
        sourceRange: {
          sources: [gridRange],
        },
      };

      // For pie charts, domain is usually labels (assume column A)
      const match = cleanRange.match(/[A-Z]+(\d+):[A-Z]+(\d+)/);
      if (match) {
        const domainRange = `A${match[1]}:A${match[2]}`;
        const domainGridRange = parseRange(domainRange, seriesSheetId);

        chartSpec.pieChart.domain = {
          sourceRange: {
            sources: [domainGridRange],
          },
        };
      }
    }

    // Create the chart
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            addChart: {
              chart: {
                spec: chartSpec,
                position: validatedInput.position,
              },
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully created ${validatedInput.chartType} chart`, {
      spreadsheetId: response.data.spreadsheetId,
      chartId: response.data.replies?.[0]?.addChart?.chart?.chartId,
      chartType: validatedInput.chartType,
      title: validatedInput.title,
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
