# Google Sheets Plugin for Claude Code

Google Sheets integration for reading, writing, formatting, and managing spreadsheets.

## What's Included

- **MCP Server** - Connects Claude Code to Google Sheets API
- **Skills** - Auto-triggers for spreadsheet tasks
- **Agents** - `data-analyst` for spreadsheet operations
- **Commands** - `/sheets:read`, `/sheets:write`, `/sheets:format`

## Installation

```bash
claude plugin install gsheets
```

**Required environment variables:**
```
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Commands

### /sheets:read

Read data from a spreadsheet:

```
/sheets:read <spreadsheet-id> <range>
/sheets:read 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Sheet1!A1:D10
```

### /sheets:write

Write data to cells:

```
/sheets:write <spreadsheet-id> <range> <values>
/sheets:write 1Bxi... Sheet1!A1 "Hello,World"
```

### /sheets:format

Format cells (colors, fonts, borders):

```
/sheets:format <spreadsheet-id> <range> <format>
/sheets:format 1Bxi... A1:B5 bold background:#ffff00
```

## Agents

Spawn the data analyst for focused work:

```
spawn data-analyst to analyze sales data in spreadsheet 1Bxi...
spawn data-analyst to create a chart from the quarterly report
```

## Usage Examples

- "Read the first 10 rows from my spreadsheet"
- "Update cell A1 with today's date"
- "Create a bar chart from columns A and B"
- "Format the header row as bold with blue background"

## Links

- [Repository](https://github.com/freema/mcp-gsheets)
- [npm](https://www.npmjs.com/package/mcp-gsheets)
