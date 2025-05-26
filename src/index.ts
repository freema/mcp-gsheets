#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { validateAuth } from './utils/google-auth.js';

// Import all tools
import { getValuesTool, handleGetValues } from './tools/get-values.js';
import { batchGetValuesTool, handleBatchGetValues } from './tools/batch-get-values.js';
import { getMetadataTool, handleGetMetadata } from './tools/get-metadata.js';
import { updateValuesTool, handleUpdateValues } from './tools/update-values.js';
import { batchUpdateValuesTool, handleBatchUpdateValues } from './tools/batch-update-values.js';
import { appendValuesTool, handleAppendValues } from './tools/append-values.js';
import { clearValuesTool, handleClearValues } from './tools/clear-values.js';
import { createSpreadsheetTool, handleCreateSpreadsheet } from './tools/create-spreadsheet.js';
import { insertSheetTool, handleInsertSheet } from './tools/insert-sheet.js';
import { deleteSheetTool, handleDeleteSheet } from './tools/delete-sheet.js';
import { duplicateSheetTool, handleDuplicateSheet } from './tools/duplicate-sheet.js';
import { copyToTool, handleCopyTo } from './tools/copy-to.js';
import { updateSheetPropertiesTool, handleUpdateSheetProperties } from './tools/update-sheet-properties.js';

// Tool handler mapping
const toolHandlers = new Map<string, (input: any) => Promise<any>>([
  ['sheets_get_values', handleGetValues],
  ['sheets_batch_get_values', handleBatchGetValues],
  ['sheets_get_metadata', handleGetMetadata],
  ['sheets_update_values', handleUpdateValues],
  ['sheets_batch_update_values', handleBatchUpdateValues],
  ['sheets_append_values', handleAppendValues],
  ['sheets_clear_values', handleClearValues],
  ['sheets_create_spreadsheet', handleCreateSpreadsheet],
  ['sheets_insert_sheet', handleInsertSheet],
  ['sheets_delete_sheet', handleDeleteSheet],
  ['sheets_duplicate_sheet', handleDuplicateSheet],
  ['sheets_copy_to', handleCopyTo],
  ['sheets_update_sheet_properties', handleUpdateSheetProperties]
]);

// All tools
const tools = [
  getValuesTool,
  batchGetValuesTool,
  getMetadataTool,
  updateValuesTool,
  batchUpdateValuesTool,
  appendValuesTool,
  clearValuesTool,
  createSpreadsheetTool,
  insertSheetTool,
  deleteSheetTool,
  duplicateSheetTool,
  copyToTool,
  updateSheetPropertiesTool
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
      tools: tools
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
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