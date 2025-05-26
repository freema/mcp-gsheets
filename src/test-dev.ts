#!/usr/bin/env node
import 'dotenv/config';
import { handleGetValues } from './tools/get-values.js';
import { handleGetMetadata } from './tools/get-metadata.js';
import { handleUpdateValues } from './tools/update-values.js';

// Set your test spreadsheet ID here
const TEST_SPREADSHEET_ID = process.env.TEST_SPREADSHEET_ID || 'YOUR_TEST_SPREADSHEET_ID';

async function testTools() {
  console.log('🧪 Testing MCP Google Sheets Server\n');

  try {
    // Test 1: Get metadata
    console.log('📋 Test 1: Get spreadsheet metadata');
    const metadata = await handleGetMetadata({
      spreadsheetId: TEST_SPREADSHEET_ID
    });
    console.log('Result:', JSON.stringify(metadata, null, 2));
    console.log('\n---\n');

    // Test 2: Read data
    console.log('📖 Test 2: Read data from List 1!A1:B5');
    const values = await handleGetValues({
      spreadsheetId: TEST_SPREADSHEET_ID,
      range: 'List 1!A1:B5'
    });
    console.log('Result:', JSON.stringify(values, null, 2));
    console.log('\n---\n');

    // Test 3: Write data
    console.log('✏️ Test 3: Write test data');
    const updateResult = await handleUpdateValues({
      spreadsheetId: TEST_SPREADSHEET_ID,
      range: 'List 1!A1:B2',
      values: [
        ['Test', 'Data'],
        [new Date().toISOString(), 'MCP Test']
      ]
    });
    console.log('Result:', JSON.stringify(updateResult, null, 2));

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run tests
testTools();