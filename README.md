# MCP Google Sheets Server

A Model Context Protocol (MCP) server for Google Sheets API integration. Enables reading, writing, and managing Google Sheets documents directly from your MCP client (e.g., Claude Desktop).

## 🚀 Quick Start

### 1. Prerequisites

- Node.js v16 or higher
- Google Cloud Project with Sheets API enabled
- Service Account with JSON key file

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-gsheets

# Install dependencies
npm install
```

### 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Sheets API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API" and click "Enable"
4. Create Service Account:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Download the JSON key file
5. Share your spreadsheets:
   - Open your Google Sheet
   - Click Share and add the service account email (from JSON file)
   - Grant "Editor" permissions

### 4. Configure MCP Client

#### Easy Setup (Recommended)

Run the interactive setup script:

```bash
npm run setup
```

This will:
- Guide you through the configuration
- Automatically find your Claude Desktop config
- Create the proper JSON configuration
- Optionally create a .env file for development

#### Manual Setup

If you prefer manual configuration, add to your Claude Desktop config:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gsheets": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-gsheets/src/index.ts"],
      "env": {
        "GOOGLE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/service-account-key.json"
      }
    }
  }
}
```

Restart Claude Desktop after adding the configuration.

## 🧪 Testing & Development

### Development Setup

1. Create `.env` file for testing:
```bash
cp .env.example .env
# Edit .env with your credentials:
# GOOGLE_PROJECT_ID=your-project-id
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# TEST_SPREADSHEET_ID=your-test-spreadsheet-id
```

2. Run in development mode:
```bash
npm run dev  # Watch mode with auto-reload (automatically loads .env file)
```

Note: The development mode automatically loads environment variables from `.env` file in the project root.

### Testing Methods

#### Method 1: Quick Test Script
```bash
npm run test:dev
```
This runs predefined tests against your test spreadsheet.

#### Method 2: Manual Testing
```bash
node scripts/test-tools.js
```
Interactive command-line tool for testing specific operations.

## 📋 Available Tools

### Reading Data
- `sheets_get_values` - Read from a range
- `sheets_batch_get_values` - Read from multiple ranges
- `sheets_get_metadata` - Get spreadsheet info

### Writing Data
- `sheets_update_values` - Write to a range
- `sheets_batch_update_values` - Write to multiple ranges
- `sheets_append_values` - Append rows to a table
- `sheets_clear_values` - Clear cell contents

### Sheet Management
- `sheets_create_spreadsheet` - Create new spreadsheet
- `sheets_insert_sheet` - Add new sheet
- `sheets_delete_sheet` - Remove sheet
- `sheets_duplicate_sheet` - Copy sheet
- `sheets_copy_to` - Copy to another spreadsheet
- `sheets_update_sheet_properties` - Update sheet settings

## ❗ Troubleshooting

### Common Issues

**"Authentication failed"**
- Verify JSON key path is absolute and correct
- Check GOOGLE_PROJECT_ID matches your project
- Ensure Sheets API is enabled

**"Permission denied"**
- Share spreadsheet with service account email
- Service account needs "Editor" role
- Check email in JSON file (client_email field)

**"Spreadsheet not found"**
- Verify spreadsheet ID from URL
- Format: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

**TypeScript errors**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Run directly without build
npm start
```

## 🔍 Finding IDs

### Spreadsheet ID
From the URL:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                        ↑ This is the spreadsheet ID
```

### Sheet ID
Use `sheets_get_metadata` to list all sheets with their IDs.

## 📝 Tips

1. Always test with a copy of your data
2. Use batch operations for better performance
3. Set appropriate permissions (read-only vs edit)
4. Check rate limits for large operations

## License

MIT