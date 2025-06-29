import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { validateUpdateChartInput } from '../utils/validators.js';
import { formatToolResponse } from '../utils/formatters.js';
import { parseJsonInput } from '../utils/json-parser.js';
import { ToolResponse } from '../types/tools.js';

export const updateChartTool: Tool = {
  name: 'sheets_update_chart',
  description: 'Update an existing chart in a Google Sheets spreadsheet',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet (found in the URL after /d/)',
      },
      chartId: {
        type: 'number',
        description: 'The ID of the chart to update (use sheets_get_metadata to find chart IDs)',
      },
      position: {
        type: 'object',
        description: 'Updated chart position settings (optional)',
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
        description: 'Updated chart type (optional)',
      },
      title: {
        type: 'string',
        description: 'Updated chart title (optional)',
      },
      subtitle: {
        type: 'string',
        description: 'Updated chart subtitle (optional)',
      },
      series: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sourceRange: {
              type: 'string',
              description: 'Data range for this series in A1 notation',
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
        description: 'Updated array of data series for the chart (optional)',
      },
      domainAxis: {
        type: 'object',
        description: 'Updated domain (X) axis configuration (optional)',
      },
      leftAxis: {
        type: 'object',
        description: 'Updated left (Y) axis configuration (optional)',
      },
      rightAxis: {
        type: 'object',
        description: 'Updated right (Y) axis configuration (optional)',
      },
      legend: {
        type: 'object',
        description: 'Updated legend configuration (optional)',
      },
      backgroundColor: {
        type: 'object',
        description: 'Updated chart background color (optional)',
      },
      altText: {
        type: 'string',
        description: 'Updated alternative text for accessibility (optional)',
      },
    },
    required: ['spreadsheetId', 'chartId'],
  },
};

export async function handleUpdateChart(input: any): Promise<ToolResponse> {
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

    const validatedInput = validateUpdateChartInput(input);
    const sheets = await getAuthenticatedClient();

    // First, get the current chart to understand what we're updating
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: validatedInput.spreadsheetId,
    });

    let currentChart: sheets_v4.Schema$EmbeddedChart | undefined;

    // Find the chart in the spreadsheet
    for (const sheet of spreadsheet.data.sheets || []) {
      const chart = sheet.charts?.find((c: any) => c.chartId === validatedInput.chartId);
      if (chart) {
        currentChart = chart;
        break;
      }
    }

    if (!currentChart) {
      throw new Error(`Chart with ID ${validatedInput.chartId} not found`);
    }

    // Build the updated chart spec based on current chart and new values
    const updatedChart: sheets_v4.Schema$EmbeddedChart = {
      chartId: validatedInput.chartId,
      position: (validatedInput.position || currentChart.position)!,
      spec: {
        ...currentChart.spec,
      },
    };

    // Update spec properties only if they are defined
    if (validatedInput.title !== undefined) {
      updatedChart.spec!.title = validatedInput.title;
    }
    if (validatedInput.subtitle !== undefined) {
      updatedChart.spec!.subtitle = validatedInput.subtitle;
    }
    if (validatedInput.backgroundColor !== undefined) {
      updatedChart.spec!.backgroundColor = validatedInput.backgroundColor;
    }
    if (validatedInput.altText !== undefined) {
      updatedChart.spec!.altText = validatedInput.altText;
    }

    // Update chart type and structure if specified
    if (validatedInput.chartType) {
      switch (validatedInput.chartType) {
        case 'PIE':
          updatedChart.spec!.pieChart = {
            legendPosition: validatedInput.legend?.position || 'BOTTOM_LEGEND',
            domain: currentChart.spec?.pieChart?.domain || {},
            series: currentChart.spec?.pieChart?.series || {},
          };
          // Clear other chart types
          delete updatedChart.spec!.basicChart;
          break;
        default:
          updatedChart.spec!.basicChart = {
            chartType: validatedInput.chartType,
            legendPosition: validatedInput.legend?.position || 'BOTTOM_LEGEND',
            axis: currentChart.spec?.basicChart?.axis || [],
            domains: currentChart.spec?.basicChart?.domains || [],
            series: currentChart.spec?.basicChart?.series || [],
          };
          // Clear other chart types
          delete updatedChart.spec!.pieChart;
      }
    }

    // Update legend if provided
    if (validatedInput.legend) {
      if (updatedChart.spec!.basicChart) {
        updatedChart.spec!.basicChart.legendPosition =
          validatedInput.legend.position || 'BOTTOM_LEGEND';
      } else if (updatedChart.spec!.pieChart) {
        updatedChart.spec!.pieChart.legendPosition =
          validatedInput.legend.position || 'BOTTOM_LEGEND';
      }
    }

    // Update series if provided
    if (validatedInput.series && updatedChart.spec!.basicChart) {
      updatedChart.spec!.basicChart.series = validatedInput.series.map((series, _index) => {
        const basicSeries: sheets_v4.Schema$BasicChartSeries = {
          series: {
            sourceRange: {
              sources: [
                {
                  sheetId: (validatedInput.position?.overlayPosition?.anchorCell?.sheetId ||
                    currentChart.position?.overlayPosition?.anchorCell?.sheetId) as number,
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endRowIndex: 100,
                  endColumnIndex: 1,
                },
              ],
            },
          },
          targetAxis: series.targetAxis || 'LEFT_AXIS',
        };

        if (series.type !== undefined) {
          basicSeries.type = series.type;
        } else if (validatedInput.chartType !== undefined) {
          basicSeries.type = validatedInput.chartType;
        }

        return basicSeries;
      });
    }

    // Update the chart
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests: [
          {
            updateEmbeddedObjectPosition: {
              objectId: validatedInput.chartId,
              newPosition: updatedChart.position,
              fields: 'position',
            },
          },
          {
            updateChartSpec: {
              chartId: validatedInput.chartId,
              spec: updatedChart.spec,
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully updated chart ${validatedInput.chartId}`, {
      spreadsheetId: response.data.spreadsheetId,
      chartId: validatedInput.chartId,
      updatedFields: Object.keys(validatedInput).filter(
        (key) => key !== 'spreadsheetId' && key !== 'chartId'
      ),
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
