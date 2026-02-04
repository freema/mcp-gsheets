---
description: Read data from a Google Sheets range
argument-hint: <spreadsheet-id> <range>
---

# /sheets:read

Read data from a Google Sheets spreadsheet.

## Usage

```
/sheets:read <spreadsheet-id> <range>
```

## Examples

```
/sheets:read 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms Sheet1!A1:D10
/sheets:read 1Bxi... Sales!A:A
/sheets:read 1Bxi... "Q1 Report"!B2:F50
```

## What Happens

Calls `sheets_get_values` and returns the cell data as a formatted table.
