#!/usr/bin/env node

import { config } from 'dotenv';
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const SPREADSHEET_ID = process.env.TEST_SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!SPREADSHEET_ID || !CREDENTIALS_PATH) {
  console.error('❌ Missing required environment variables:');
  if (!SPREADSHEET_ID) console.error('  - TEST_SPREADSHEET_ID');
  if (!CREDENTIALS_PATH) console.error('  - GOOGLE_APPLICATION_CREDENTIALS');
  process.exit(1);
}

// Initialize Google Sheets client
const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Test data
const TEST_DATA = [
  ['Product', 'Price', 'Quantity', 'Total'],
  ['Apple', 1.99, 10, 19.90],
  ['Banana', 0.99, 15, 14.85],
  ['Orange', 2.49, 8, 19.92],
  ['Grape', 3.99, 5, 19.95],
  ['Total', '', '', '=SUM(D2:D5)'],
];

async function clearSheet() {
  console.log('🧹 Clearing sheet...');
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A1:Z100',
    });
    console.log('✅ Sheet cleared');
  } catch (error) {
    console.error('❌ Error clearing sheet:', error.message);
  }
}

async function populateTestData() {
  console.log('📝 Populating test data...');
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A1:D6',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: TEST_DATA,
      },
    });
    console.log('✅ Test data populated');
  } catch (error) {
    console.error('❌ Error populating data:', error.message);
  }
}

async function testFormatCells() {
  console.log('\n🎨 Testing cell formatting...');
  
  try {
    // Get sheet ID
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties',
    });
    const sheetId = metadata.data.sheets[0].properties.sheetId;

    // Format header row
    console.log('  - Formatting header row (bold, blue background)...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.5, blue: 0.9 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 12,
                },
                horizontalAlignment: 'CENTER',
              },
            },
            fields: 'userEnteredFormat',
          },
        }],
      },
    });

    // Format price column as currency
    console.log('  - Formatting price column as currency...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 1,
              endRowIndex: 5,
              startColumnIndex: 1,
              endColumnIndex: 2,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '$#,##0.00',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        }],
      },
    });

    // Format total row
    console.log('  - Formatting total row (bold, yellow background)...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 5,
              endRowIndex: 6,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 1, green: 0.95, blue: 0.6 },
                textFormat: {
                  bold: true,
                },
              },
            },
            fields: 'userEnteredFormat',
          },
        }],
      },
    });

    console.log('✅ Cell formatting completed');
  } catch (error) {
    console.error('❌ Error formatting cells:', error.message);
  }
}

async function testBorders() {
  console.log('\n🔲 Testing borders...');
  
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties',
    });
    const sheetId = metadata.data.sheets[0].properties.sheetId;

    console.log('  - Adding borders to the entire table...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 6,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            top: {
              style: 'SOLID_MEDIUM',
              color: { red: 0, green: 0, blue: 0 },
            },
            bottom: {
              style: 'SOLID_MEDIUM',
              color: { red: 0, green: 0, blue: 0 },
            },
            left: {
              style: 'SOLID_MEDIUM',
              color: { red: 0, green: 0, blue: 0 },
            },
            right: {
              style: 'SOLID_MEDIUM',
              color: { red: 0, green: 0, blue: 0 },
            },
            innerHorizontal: {
              style: 'SOLID',
              color: { red: 0.5, green: 0.5, blue: 0.5 },
            },
            innerVertical: {
              style: 'SOLID',
              color: { red: 0.5, green: 0.5, blue: 0.5 },
            },
          },
        }],
      },
    });

    console.log('✅ Borders added successfully');
  } catch (error) {
    console.error('❌ Error adding borders:', error.message);
  }
}

async function testMergeCells() {
  console.log('\n🔗 Testing cell merging...');
  
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties',
    });
    const sheetId = metadata.data.sheets[0].properties.sheetId;

    // Add a title row
    console.log('  - Adding title row...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A8',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Product Sales Report']],
      },
    });

    // Merge cells for title
    console.log('  - Merging cells A8:D8 for title...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          mergeCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 7,
              endRowIndex: 8,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            mergeType: 'MERGE_ALL',
          },
        }],
      },
    });

    // Format merged title
    console.log('  - Formatting merged title...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 7,
              endRowIndex: 8,
              startColumnIndex: 0,
              endColumnIndex: 4,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.1, green: 0.3, blue: 0.6 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 16,
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat',
          },
        }],
      },
    });

    console.log('✅ Cell merging completed');
  } catch (error) {
    console.error('❌ Error merging cells:', error.message);
  }
}

async function testConditionalFormatting() {
  console.log('\n🎯 Testing conditional formatting...');
  
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties',
    });
    const sheetId = metadata.data.sheets[0].properties.sheetId;

    // Test with text contains condition first
    console.log('  - Adding conditional formatting for product names containing "a"...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startRowIndex: 1,
                endRowIndex: 5,
                startColumnIndex: 0,
                endColumnIndex: 1,
              }],
              booleanRule: {
                condition: {
                  type: 'TEXT_CONTAINS',
                  values: [{
                    userEnteredValue: 'a',
                  }],
                },
                format: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 1 },
                  textFormat: {
                    italic: true,
                  },
                },
              },
            },
          },
        }],
      },
    });

    console.log('  - Adding gradient formatting for quantity column...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startRowIndex: 1,
                endRowIndex: 5,
                startColumnIndex: 2,
                endColumnIndex: 3,
              }],
              gradientRule: {
                minpoint: {
                  color: { red: 1, green: 0.9, blue: 0.9 },
                  type: 'MIN',
                },
                maxpoint: {
                  color: { red: 0.2, green: 0.8, blue: 0.2 },
                  type: 'MAX',
                },
              },
            },
          },
        }],
      },
    });

    console.log('✅ Conditional formatting completed');
  } catch (error) {
    console.error('❌ Error adding conditional formatting:', error.message);
  }
}

async function testAllFormattingTools() {
  console.log('🚀 Starting formatting tools test...');
  console.log(`📊 Using spreadsheet: ${SPREADSHEET_ID}`);
  console.log(`🔑 Using credentials: ${CREDENTIALS_PATH}`);
  
  try {
    await clearSheet();
    await populateTestData();
    await testFormatCells();
    await testBorders();
    await testMergeCells();
    await testConditionalFormatting();
    
    console.log('\n✨ All formatting tests completed successfully!');
    console.log(`🔗 View your formatted spreadsheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testAllFormattingTools();