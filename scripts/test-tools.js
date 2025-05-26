#!/usr/bin/env node

// Simple test script for calling MCP server via stdio
const { spawn } = require('child_process');
const readline = require('readline');

// Set environment variables
const env = {
  ...process.env,
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || 'your-project-id',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/path/to/credentials.json'
};

// Launch MCP server
const server = spawn('node', ['dist/index.js'], { env });

// Create interface for reading/writing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Buffer for incoming data
let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        console.log('📥 Server response:', JSON.stringify(message, null, 2));
      } catch (e) {
        console.log('📥 Server output:', line);
      }
    }
  });
});

server.stderr.on('data', (data) => {
  console.error('❌ Server error:', data.toString());
});

// Function to send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  };
  
  console.log('📤 Sending request:', JSON.stringify(request, null, 2));
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Test request examples
const examples = {
  '1': {
    name: 'Initialize',
    request: () => sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {}
    })
  },
  '2': {
    name: 'List Tools',
    request: () => sendRequest('tools/list')
  },
  '3': {
    name: 'Get Metadata',
    request: () => {
      rl.question('Spreadsheet ID: ', (id) => {
        sendRequest('tools/call', {
          name: 'sheets_get_metadata',
          arguments: { spreadsheetId: id }
        });
      });
    }
  },
  '4': {
    name: 'Get Values',
    request: () => {
      rl.question('Spreadsheet ID: ', (id) => {
        rl.question('Range (e.g. Sheet1!A1:B10): ', (range) => {
          sendRequest('tools/call', {
            name: 'sheets_get_values',
            arguments: { spreadsheetId: id, range }
          });
        });
      });
    }
  },
  '5': {
    name: 'Exit',
    request: () => {
      server.kill();
      process.exit(0);
    }
  }
};

// Main menu
function showMenu() {
  console.log('\n🧪 MCP Google Sheets Test Menu:');
  Object.entries(examples).forEach(([key, value]) => {
    console.log(`${key}. ${value.name}`);
  });
  
  rl.question('\nSelect action: ', (choice) => {
    const example = examples[choice];
    if (example) {
      example.request();
      setTimeout(showMenu, 2000);
    } else {
      console.log('Invalid choice');
      showMenu();
    }
  });
}

// Start
console.log('🚀 MCP Google Sheets Server Test Tool');
console.log('=====================================\n');

// Wait for server startup then show menu
setTimeout(showMenu, 1000);