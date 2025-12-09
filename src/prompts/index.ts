import { Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Prompt: Create Table
 * Helps users create a new table with headers and data
 */
export const createTablePrompt: Prompt = {
  name: 'create-table',
  description: 'Guide for creating a new table with headers and data in a Google Spreadsheet',
  arguments: [
    {
      name: 'spreadsheetId',
      description: 'The ID of the target spreadsheet (from the URL)',
      required: true,
    },
    {
      name: 'sheetName',
      description: 'Name of the sheet to create the table in (default: Sheet1)',
      required: false,
    },
    {
      name: 'dataDescription',
      description: 'Description of the data/table you want to create',
      required: true,
    },
  ],
};

export function handleCreateTable(args: Record<string, string>): GetPromptResult {
  const spreadsheetId = args.spreadsheetId || '{spreadsheetId}';
  const sheetName = args.sheetName || 'Sheet1';
  const dataDescription = args.dataDescription || 'your data';

  return {
    description: `Create a table for: ${dataDescription}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to create a table in Google Sheets.

Spreadsheet ID: ${spreadsheetId}
Sheet: ${sheetName}
Data description: ${dataDescription}

Please help me:
1. First, check if I have access to the spreadsheet using sheets_check_access
2. Define appropriate column headers based on the data description
3. Create the table structure using sheets_update_values
4. Optionally format the header row (bold, background color) using sheets_format_cells

Please proceed step by step.`,
        },
      },
    ],
  };
}

/**
 * Prompt: Format Report
 * Helps users format data as a professional report
 */
export const formatReportPrompt: Prompt = {
  name: 'format-report',
  description: 'Format existing data as a professional report with headers, borders, and styling',
  arguments: [
    {
      name: 'spreadsheetId',
      description: 'The ID of the spreadsheet containing the data',
      required: true,
    },
    {
      name: 'range',
      description: 'The range containing data to format (e.g., "Sheet1!A1:E20")',
      required: true,
    },
    {
      name: 'reportStyle',
      description: 'Style preference: "professional", "minimal", or "colorful"',
      required: false,
    },
  ],
};

export function handleFormatReport(args: Record<string, string>): GetPromptResult {
  const spreadsheetId = args.spreadsheetId || '{spreadsheetId}';
  const range = args.range || 'Sheet1!A1:E20';
  const reportStyle = args.reportStyle || 'professional';

  const styleGuide: Record<string, string> = {
    professional: 'navy blue headers with white text, light gray alternating rows, thin borders',
    minimal: 'bold headers, subtle bottom border on header row only, clean white background',
    colorful: 'vibrant colored headers, light pastel alternating row colors, medium borders',
  };

  return {
    description: `Format report in ${reportStyle} style`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to format my data as a ${reportStyle} report.

Spreadsheet ID: ${spreadsheetId}
Data range: ${range}
Style: ${reportStyle} - ${styleGuide[reportStyle] || styleGuide['professional']}

Please help me:
1. First, read the data to understand its structure using sheets_get_values
2. Format the header row (first row) with appropriate styling using sheets_format_cells
3. Add borders to the data range using sheets_update_borders
4. Optionally auto-resize columns for better readability

Use the ${reportStyle} style guidelines to make the report look great.`,
        },
      },
    ],
  };
}

/**
 * Prompt: Summarize Data
 * Helps users analyze and summarize spreadsheet data
 */
export const summarizeDataPrompt: Prompt = {
  name: 'summarize-data',
  description: 'Analyze spreadsheet data and provide insights or create a summary',
  arguments: [
    {
      name: 'spreadsheetId',
      description: 'The ID of the spreadsheet to analyze',
      required: true,
    },
    {
      name: 'range',
      description: 'The range containing data to analyze (e.g., "Sheet1!A1:F100")',
      required: true,
    },
    {
      name: 'analysisType',
      description: 'Type of analysis: "overview", "statistics", or "trends"',
      required: false,
    },
  ],
};

export function handleSummarizeData(args: Record<string, string>): GetPromptResult {
  const spreadsheetId = args.spreadsheetId || '{spreadsheetId}';
  const range = args.range || 'Sheet1!A:Z';
  const analysisType = args.analysisType || 'overview';

  return {
    description: `Analyze data: ${analysisType}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to analyze and summarize my spreadsheet data.

Spreadsheet ID: ${spreadsheetId}
Data range: ${range}
Analysis type: ${analysisType}

Please help me:
1. First, get the spreadsheet metadata using sheets_get_metadata to understand the structure
2. Read the data from the specified range using sheets_get_values
3. Analyze the data and provide:
   - Overview of the data structure (columns, rows, data types)
   - Key statistics (counts, sums, averages where applicable)
   - Notable patterns or insights
4. Suggest any potential improvements to the data organization

Focus on a ${analysisType} analysis.`,
        },
      },
    ],
  };
}

/**
 * Prompt: Create Chart Guide
 * Helps users create charts from their data
 */
export const createChartGuidePrompt: Prompt = {
  name: 'create-chart-guide',
  description: 'Step-by-step guide to create a chart from spreadsheet data',
  arguments: [
    {
      name: 'spreadsheetId',
      description: 'The ID of the spreadsheet containing the data',
      required: true,
    },
    {
      name: 'dataRange',
      description: 'The range containing data for the chart (e.g., "Sheet1!A1:B10")',
      required: true,
    },
    {
      name: 'chartType',
      description: 'Preferred chart type: "COLUMN", "BAR", "LINE", "PIE", "AREA", or "SCATTER"',
      required: false,
    },
  ],
};

export function handleCreateChartGuide(args: Record<string, string>): GetPromptResult {
  const spreadsheetId = args.spreadsheetId || '{spreadsheetId}';
  const dataRange = args.dataRange || 'Sheet1!A1:B10';
  const chartType = args.chartType || 'COLUMN';

  return {
    description: `Create ${chartType} chart`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `I want to create a ${chartType} chart from my spreadsheet data.

Spreadsheet ID: ${spreadsheetId}
Data range: ${dataRange}
Chart type: ${chartType}

Please help me:
1. First, read the data to understand what we're visualizing using sheets_get_values
2. Get the sheet ID needed for chart creation using sheets_get_metadata
3. Create the chart using sheets_create_chart with appropriate configuration:
   - Title based on the data
   - Proper axis labels
   - Legend if needed
4. Position the chart appropriately on the sheet

Provide the chart configuration and create it step by step.`,
        },
      },
    ],
  };
}

/**
 * All prompts array for listing
 */
export const allPrompts: Prompt[] = [
  createTablePrompt,
  formatReportPrompt,
  summarizeDataPrompt,
  createChartGuidePrompt,
];

/**
 * Prompt handlers map
 */
export const promptHandlers = new Map<string, (args: Record<string, string>) => GetPromptResult>([
  ['create-table', handleCreateTable],
  ['format-report', handleFormatReport],
  ['summarize-data', handleSummarizeData],
  ['create-chart-guide', handleCreateChartGuide],
]);

/**
 * Handle get prompt request
 */
export function handleGetPrompt(
  name: string,
  args: Record<string, string> | undefined
): GetPromptResult {
  const handler = promptHandlers.get(name);

  if (!handler) {
    throw new Error(
      `Unknown prompt: ${name}. Available prompts: ${allPrompts.map((p) => p.name).join(', ')}`
    );
  }

  return handler(args || {});
}
