---
description: Format cells in a Google Sheets range
argument-hint: <spreadsheet-id> <range> <format>
---

# /sheets:format

Apply formatting to cells in a Google Sheets spreadsheet.

## Usage

```
/sheets:format <spreadsheet-id> <range> <format-options>
```

## Examples

```
/sheets:format 1Bxi... A1:D1 bold
/sheets:format 1Bxi... A1:A10 background:#ffff00
/sheets:format 1Bxi... B2:B20 number-format:currency
/sheets:format 1Bxi... Header!A1:Z1 bold center background:#4285f4 color:#ffffff
```

## Format Options

- `bold`, `italic`, `underline` - Text styles
- `background:#hex` - Background color
- `color:#hex` - Text color
- `center`, `left`, `right` - Alignment
- `number-format:currency|percent|date` - Number formats

## What Happens

Calls `sheets_format_cells` with the specified formatting options.
