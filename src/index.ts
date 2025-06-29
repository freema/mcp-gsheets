#!/usr/bin/env node

// Load .env file in development mode
if (process.env.NODE_ENV !== 'production') {
  try {
    const { config } = await import('dotenv');
    const result = config();
    if (result.parsed) {
      console.error('📋 Loaded .env file for development');
    }
  } catch (error) {
    console.error('⚠️ Failed to load .env file:', error);
  }
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { validateAuth } from './utils/google-auth.js';

// Import all tools
import * as tools from './tools/index.js';

// Tool handler mapping
const toolHandlers = new Map<string, (input: any) => Promise<any>>([
  ['sheets_check_access', tools.handleCheckAccess],
  ['sheets_get_values', tools.handleGetValues],
  ['sheets_batch_get_values', tools.handleBatchGetValues],
  ['sheets_get_metadata', tools.handleGetMetadata],
  ['sheets_update_values', tools.handleUpdateValues],
  ['sheets_batch_update_values', tools.handleBatchUpdateValues],
  ['sheets_append_values', tools.handleAppendValues],
  ['sheets_clear_values', tools.handleClearValues],
  ['sheets_create_spreadsheet', tools.handleCreateSpreadsheet],
  ['sheets_insert_sheet', tools.handleInsertSheet],
  ['sheets_delete_sheet', tools.handleDeleteSheet],
  ['sheets_duplicate_sheet', tools.handleDuplicateSheet],
  ['sheets_copy_to', tools.handleCopyTo],
  ['sheets_update_sheet_properties', tools.handleUpdateSheetProperties],
  ['sheets_format_cells', tools.formatCellsHandler],
  ['sheets_update_borders', tools.updateBordersHandler],
  ['sheets_merge_cells', tools.mergeCellsHandler],
  ['sheets_unmerge_cells', tools.unmergeCellsHandler],
  ['sheets_add_conditional_formatting', tools.addConditionalFormattingHandler],
  // Batch operations
  ['sheets_batch_delete_sheets', tools.handleBatchDeleteSheets],
  ['sheets_batch_format_cells', tools.handleBatchFormatCells],
  // Chart operations
  ['sheets_create_chart', tools.handleCreateChart],
  ['sheets_update_chart', tools.handleUpdateChart],
  ['sheets_delete_chart', tools.handleDeleteChart],
]);

// All tools
const allTools = [
  tools.checkAccessTool,
  tools.getValuesTool,
  tools.batchGetValuesTool,
  tools.getMetadataTool,
  tools.updateValuesTool,
  tools.batchUpdateValuesTool,
  tools.appendValuesTool,
  tools.clearValuesTool,
  tools.createSpreadsheetTool,
  tools.insertSheetTool,
  tools.deleteSheetTool,
  tools.duplicateSheetTool,
  tools.copyToTool,
  tools.updateSheetPropertiesTool,
  tools.formatCellsTool,
  tools.updateBordersTool,
  tools.mergeCellsTool,
  tools.unmergeCellsTool,
  tools.addConditionalFormattingTool,
  // Batch operations
  tools.batchDeleteSheetsTool,
  tools.batchFormatCellsTool,
  // Chart operations
  tools.createChartTool,
  tools.updateChartTool,
  tools.deleteChartTool,
];

async function main() {
  // Validate authentication on startup
  try {
    validateAuth();
  } catch (error: any) {
    console.error('Authentication Error:', error.message);
    process.exit(1);
  }

  const server = new Server(
    {
      name: 'spreadsheet',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: allTools,
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    const handler = toolHandlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      return await handler(args);
    } catch (error: any) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  });

  // List resources (not implemented for this server)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });

  // Read resource (not implemented for this server)
  server.setRequestHandler(ReadResourceRequestSchema, async () => {
    throw new Error('Resource reading not implemented');
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Google Sheets MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
