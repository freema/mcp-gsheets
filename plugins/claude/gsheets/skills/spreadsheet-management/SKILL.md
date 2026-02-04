---
name: spreadsheet-management
description: This skill should be used when the user asks about Google Sheets, spreadsheets, cells, rows, columns, charts, or data tables. Activates for reading, writing, formatting, or analyzing spreadsheet data.
---

When the user asks about spreadsheets or data in Google Sheets, use the gsheets MCP tools.

## When to Use This Skill

Activate when the user:

- Wants to read spreadsheet data ("Get data from sheet", "Read column A")
- Needs to write data ("Update cell A1", "Add a row", "Append data")
- Formats cells ("Make header bold", "Add borders", "Change colors")
- Creates charts ("Create a bar chart", "Add a pie chart")
- Manages sheets ("Create new sheet", "Delete sheet", "Copy sheet")

## Tools Reference

| Task | Tool |
|------|------|
| Read range | `sheets_get_values` |
| Read multiple | `sheets_batch_get_values` |
| Get info | `sheets_get_metadata` |
| Write range | `sheets_update_values` |
| Append rows | `sheets_append_values` |
| Insert rows | `sheets_insert_rows` |
| Format cells | `sheets_format_cells` |
| Borders | `sheets_update_borders` |
| Merge | `sheets_merge_cells` |
| Create chart | `sheets_create_chart` |
| New sheet | `sheets_insert_sheet` |

## Spreadsheet ID

Found in the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

## Range Notation

```
Sheet1!A1:D10     # Specific range
Sheet1!A:A        # Entire column
Sheet1!1:1        # Entire row
A1:D10            # First sheet, specific range
'Sheet Name'!A1   # Sheet name with spaces
```

## Example Workflows

**Read and summarize:**
```
sheets_get_metadata spreadsheetId="1Bxi..."
sheets_get_values spreadsheetId="1Bxi..." range="Data!A1:F100"
```

**Format header row:**
```
sheets_format_cells spreadsheetId="1Bxi..." range="A1:Z1" bold=true backgroundColor="#4285f4"
```

**Create chart:**
```
sheets_create_chart spreadsheetId="1Bxi..." sheetId=0 chartType="BAR" dataRange="A1:B10"
```
