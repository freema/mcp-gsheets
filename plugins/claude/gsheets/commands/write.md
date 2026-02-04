---
description: Write data to a Google Sheets range
argument-hint: <spreadsheet-id> <range> <values>
---

# /sheets:write

Write data to a Google Sheets spreadsheet.

## Usage

```
/sheets:write <spreadsheet-id> <range> <values>
```

Values can be comma-separated (single row) or JSON array (multiple rows).

## Examples

```
/sheets:write 1Bxi... Sheet1!A1 "Hello World"
/sheets:write 1Bxi... A1:C1 "Name,Email,Phone"
/sheets:write 1Bxi... A1:B2 [["Header1","Header2"],["Value1","Value2"]]
```

## What Happens

Calls `sheets_update_values` to write the data to the specified range.
