# MCP Google Sheets Server

<a href="https://glama.ai/mcp/servers/@freema/mcp-gsheets">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@freema/mcp-gsheets/badge" />
</a>

[![npm version](https://badge.fury.io/js/mcp-gsheets.svg)](https://www.npmjs.com/package/mcp-gsheets)
![CI](https://github.com/freema/mcp-gsheets/workflows/CI/badge.svg)
![Coverage](https://codecov.io/gh/freema/mcp-gsheets/branch/main/graph/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-007ACC?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?logo=prettier&logoColor=white)

A Model Context Protocol (MCP) server for Google Sheets API integration. Enables reading, writing, and managing Google Sheets documents directly from your MCP client (e.g., Claude Code, Claude Desktop, Cursor, etc.).

## Key Features

- **Complete Google Sheets Integration**: Read, write, and manage spreadsheets
- **Advanced Operations**: Batch operations, formatting, charts, and conditional formatting
- **Flexible Authentication**: Support for both file-based and JSON string credentials
- **Production Ready**: Built with TypeScript, comprehensive error handling, and full test coverage

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher
- [Google Cloud Project](https://console.cloud.google.com) with Sheets API enabled
- Service Account with JSON key file
- [npm](https://www.npmjs.com/)

## Getting Started

### Quick Install (Recommended)

Add the following config to your MCP client:

```json
{
  "mcpServers": {
    "mcp-gsheets": {
      "command": "npx",
      "args": ["-y", "mcp-gsheets@latest"],
      "env": {
        "GOOGLE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/service-account-key.json"
      }
    }
  }
}
```

> [!NOTE]
> Using `mcp-gsheets@latest` ensures that your MCP client will always use the latest version of the MCP Google Sheets server.

### MCP Client Configuration

<details>
  <summary>Claude Code</summary>
  Use the Claude Code CLI to add the MCP Google Sheets server (<a href="https://docs.anthropic.com/en/docs/claude-code/mcp">guide</a>):

```bash
claude mcp add mcp-gsheets npx mcp-gsheets@latest
```

After adding, edit your Claude Code config to add the required environment variables:

```json
{
  "mcpServers": {
    "mcp-gsheets": {
      "command": "npx",
      "args": ["mcp-gsheets@latest"],
      "env": {
        "GOOGLE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/service-account-key.json"
      }
    }
  }
}
```

</details>

<details>
  <summary>Claude Desktop</summary>

Add to your Claude Desktop config:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-gsheets": {
      "command": "npx",
      "args": ["-y", "mcp-gsheets@latest"],
      "env": {
        "GOOGLE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/service-account-key.json"
      }
    }
  }
}
```

</details>

<details>
  <summary>Cursor</summary>

Go to `Cursor Settings` → `MCP` → `New MCP Server`. Use the config provided above.

</details>

<details>
  <summary>Cline</summary>

Follow https://docs.cline.bot/mcp/configuring-mcp-servers and use the config provided above.

</details>

<details>
  <summary>Other MCP Clients</summary>

For other MCP clients, use the standard configuration format shown above. Ensure the `command` is set to `npx` and include the environment variables for Google Cloud authentication.

</details>

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Sheets API:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API" and click "Enable"
4. Create Service Account:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - In the service accounts list, click the three dots in the `Actions` column → `Manage keys` → `Add key` → `Create new key` → select JSON format
   - Download the JSON key file
5. Share your spreadsheets:
   - Open your Google Sheet
   - Click Share and add the service account email (from JSON file)
   - Grant "Editor" permissions

### Alternative Authentication Methods

#### Option 1: JSON String Authentication

Instead of using a file path for credentials, you can provide the service account credentials directly as a JSON string. This is useful for containerized environments, CI/CD pipelines, or when you want to avoid managing credential files.

```json
{
  "mcpServers": {
    "mcp-gsheets": {
      "command": "npx",
      "args": ["-y", "mcp-gsheets@latest"],
      "env": {
        "GOOGLE_PROJECT_ID": "your-project-id",
        "GOOGLE_SERVICE_ACCOUNT_KEY": "{\"type\":\"service_account\",\"project_id\":\"your-project\",\"private_key_id\":\"...\",\"private_key\":\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\",\"client_email\":\"...@....iam.gserviceaccount.com\",\"client_id\":\"...\",\"auth_uri\":\"https://accounts.google.com/o/oauth2/auth\",\"token_uri\":\"https://oauth2.googleapis.com/token\",\"auth_provider_x509_cert_url\":\"https://www.googleapis.com/oauth2/v1/certs\",\"client_x509_cert_url\":\"...\"}"
      }
    }
  }
}
```

**Note**: When using `GOOGLE_SERVICE_ACCOUNT_KEY`:
- The entire JSON must be on a single line
- All quotes must be escaped with backslashes
- Newlines in the private key must be represented as `\\n`
- If the JSON includes a `project_id`, you can omit `GOOGLE_PROJECT_ID`

#### Option 2: Private Key Authentication (Simplified)

For the most user-friendly approach, you can provide just the private key and email directly. This is the simplest method and requires only two fields from your service account JSON:

```json
{
  "mcpServers": {
    "mcp-gsheets": {
      "command": "npx",
      "args": ["-y", "mcp-gsheets@latest"],
      "env": {
        "GOOGLE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCgR6bvMNOUHZ29\\n+YgbVHAXsT/s+L/jnXTCB193zikCzspSBSfxLu8VRDjkNq9WUoDxizTATzMFNvNf\\n...\\n-----END PRIVATE KEY-----\\n",
        "GOOGLE_CLIENT_EMAIL": "spreadsheet@your-project.iam.gserviceaccount.com"
      }
    }
  }
}
```

**Note**: When using `GOOGLE_PRIVATE_KEY`:
- Newlines in the private key should be represented as `\\n`
- The private key must include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- The client email should be the service account email from your JSON file
- `GOOGLE_PROJECT_ID` is optional when using this method

## Local Development Setup

If you want to develop or contribute to this project, you can clone and build it locally:

```bash
# Clone the repository
git clone https://github.com/freema/mcp-gsheets.git
cd mcp-gsheets

# Install dependencies
npm install

# Build the project
npm run build
```

### Interactive Setup Script

Run the interactive setup script to configure your local MCP client:

```bash
npm run setup
```

This will:
- Guide you through the configuration
- Automatically detect your Node.js installation (including nvm)
- Find your Claude Desktop config
- Create the proper JSON configuration
- Optionally create a .env file for development

### Manual Local Configuration

If you prefer manual configuration with a local build, add to your MCP client config:

```json
{
  "mcpServers": {
    "mcp-gsheets": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gsheets/dist/index.js"],
      "env": {
        "GOOGLE_PROJECT_ID": "your-project-id",
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/service-account-key.json"
      }
    }
  }
}
```

## 📦 Build & Development

### Development Commands

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean

# Run MCP inspector for debugging
npm run inspector

# Run MCP inspector in development mode
npm run inspector:dev
```

### Task Runner (Alternative)

If you have [Task](https://taskfile.dev) installed:

```bash
# Install dependencies
task install

# Build the project
task build

# Run in development mode
task dev

# Run linter
task lint

# Format code
task fmt

# Run all checks
task check
```

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
npm run dev  # Watch mode with auto-reload
```

## 📋 Available Tools

### Reading Data
- `sheets_get_values` - Read from a range
- `sheets_batch_get_values` - Read from multiple ranges
- `sheets_get_metadata` - Get spreadsheet info
- `sheets_check_access` - Check access permissions

### Writing Data
- `sheets_update_values` - Write to a range
- `sheets_batch_update_values` - Write to multiple ranges
- `sheets_append_values` - Append rows to a table (**Note:** Default `insertDataOption` is `OVERWRITE`. To insert new rows, set `insertDataOption: 'INSERT_ROWS'`)
- `sheets_clear_values` - Clear cell contents
- `sheets_insert_rows` - Insert new rows at specific position with optional data

### Sheet Management
- `sheets_insert_sheet` - Add new sheet
- `sheets_delete_sheet` - Remove sheet
- `sheets_duplicate_sheet` - Copy sheet
- `sheets_copy_to` - Copy to another spreadsheet
- `sheets_update_sheet_properties` - Update sheet settings

### Batch Operations
- `sheets_batch_delete_sheets` - Delete multiple sheets at once
- `sheets_batch_format_cells` - Format multiple cell ranges at once

### Cell Formatting
- `sheets_format_cells` - Format cells (colors, fonts, alignment, number formats)
- `sheets_update_borders` - Add or modify cell borders
- `sheets_merge_cells` - Merge cells together
- `sheets_unmerge_cells` - Unmerge previously merged cells
- `sheets_add_conditional_formatting` - Add conditional formatting rules

### Charts
- `sheets_create_chart` - Create various types of charts
- `sheets_update_chart` - Modify existing charts
- `sheets_delete_chart` - Remove charts

## 🔧 Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Formatting

```bash
# Check formatting with Prettier
npm run format:check

# Format code
npm run format
```

### Type Checking

```bash
# Run TypeScript type checking
npm run typecheck
```

## ❗ Troubleshooting

### Common Issues

**"Authentication failed"**
- If using file-based auth: Verify JSON key path is absolute and correct
- If using JSON string auth: Ensure JSON is properly escaped and valid
- If using private key auth: Check that the private key includes BEGIN/END markers and newlines are escaped as `\\n`
- Verify GOOGLE_CLIENT_EMAIL is a valid service account email
- Check GOOGLE_PROJECT_ID matches your project (or is included in JSON for full JSON auth)
- Ensure Sheets API is enabled

**"Permission denied"**
- Share spreadsheet with service account email
- Service account needs "Editor" role
- Check email in JSON file (client_email field)

**"Spreadsheet not found"**
- Verify spreadsheet ID from URL
- Format: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

**MCP Connection Issues**
- Ensure you're using the built version (`dist/index.js`)
- Check that Node.js path is correct in Claude Desktop config
- Look for errors in Claude Desktop logs
- Use `npm run inspector` to debug

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
5. Use `sheets_check_access` to verify permissions before operations

## 📘 Tool Details

### sheets_insert_rows

Insert new rows at a specific position in a spreadsheet with optional data.

**Parameters:**
- `spreadsheetId` (required): The ID of the spreadsheet
- `range` (required): A1 notation anchor point where rows will be inserted (e.g., "Sheet1!A5")
- `rows` (optional): Number of rows to insert (default: 1)
- `position` (optional): 'BEFORE' or 'AFTER' the anchor row (default: 'BEFORE')
- `inheritFromBefore` (optional): Whether to inherit formatting from the row before (default: false)
- `values` (optional): 2D array of values to fill the newly inserted rows
- `valueInputOption` (optional): 'RAW' or 'USER_ENTERED' (default: 'USER_ENTERED')

**Examples:**

```javascript
// Insert 1 empty row before row 5
{
  "spreadsheetId": "your-spreadsheet-id",
  "range": "Sheet1!A5"
}

// Insert 3 rows after row 10 with data
{
  "spreadsheetId": "your-spreadsheet-id",
  "range": "Sheet1!A10",
  "rows": 3,
  "position": "AFTER",
  "values": [
    ["John", "Doe", "john@example.com"],
    ["Jane", "Smith", "jane@example.com"],
    ["Bob", "Johnson", "bob@example.com"]
  ]
}
```

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting (`npm run check`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 👤 Author

**Tomáš Grásl** - [tomasgrasl.cz](https://www.tomasgrasl.cz/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.