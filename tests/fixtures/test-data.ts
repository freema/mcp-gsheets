export const testSpreadsheetIds = {
  valid: [
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    '1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
    'abcdefghijklmnopqrstuvwxyz1234567890-_ABCDEF',
  ],
  invalid: [
    '', // empty
    ' ', // whitespace
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms!', // special char
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms@', // special char
    'spreadsheet with spaces', // spaces
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit', // full URL
  ],
};

export const testRanges = {
  valid: {
    simple: [
      'A1',
      'B2',
      'Z99',
      'AA1',
      'AB123',
      'ZZ9999',
    ],
    withRange: [
      'A1:B2',
      'A1:Z100',
      'AA1:AB10',
    ],
    withSheetName: [
      'Sheet1!A1',
      'Sheet1!A1:B10',
      "'My Sheet'!A1", // with spaces
      "'Sheet-123'!A1:Z99", // with dash
      "'Übungen'!A1:B2", // with diacritics
      "'Sheet (Copy)'!A1", // with parentheses
      "'Sheet #1'!A1:B10", // with hash
      "'Sheet & Data'!A1", // with ampersand
      "'2024 Budget'!A1:Z99", // starting with number
      "'Sheet!Name'!A1", // with exclamation in name
      "'Sheet''s Data'!A1", // with apostrophe (escaped)
    ],
    edgeCases: [
      "'Complex Sheet Name with Spaces & Special Chars (2024)'!AA1:ZZ999",
    ],
  },
  invalid: [
    '', // empty
    ' ', // whitespace
    'A', // no row number
    '1', // no column letter
    'A1:', // incomplete range
    ':B2', // incomplete range
    'A1:A', // mixed notation
    '1:A', // mixed notation
    'Sheet1', // no range
    'Sheet1!', // no range after sheet
    'Sheet1!!A1', // double exclamation
    'Sheet1!A1!B2', // multiple exclamations
    '!A1', // missing sheet name
    'Sheet1!1A', // wrong order
    'Sheet1!A1B2', // no colon separator
    null,
    undefined,
  ],
};

export const testValues = {
  simple: [
    ['A1', 'B1', 'C1'],
    ['A2', 'B2', 'C2'],
    ['A3', 'B3', 'C3'],
  ],
  mixed: [
    ['Text', 123, true],
    ['Special chars: !@#$%', -456.78, false],
    ['Unicode: 你好 🌍', 0, null],
    ['', undefined, ''], // empty values
  ],
  empty: [],
  singleCell: [['Single Value']],
  largeData: Array(100).fill(null).map((_, i) => 
    Array(26).fill(null).map((_, j) => `R${i + 1}C${j + 1}`)
  ),
};

export const testInputs = {
  getValues: {
    valid: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:B10',
      majorDimension: 'ROWS',
      valueRenderOption: 'FORMATTED_VALUE',
    },
    minimal: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
    },
    withOptions: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A:Z',
      majorDimension: 'COLUMNS',
      valueRenderOption: 'UNFORMATTED_VALUE',
    },
  },
  updateValues: {
    valid: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:C3',
      values: testValues.simple,
      valueInputOption: 'USER_ENTERED',
    },
    minimal: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
      values: [['Test']],
    },
  },
  batchGetValues: {
    valid: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      ranges: ['Sheet1!A1:B10', 'Sheet2!C1:D5', 'A:A'],
      majorDimension: 'ROWS',
      valueRenderOption: 'FORMATTED_VALUE',
    },
    minimal: {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      ranges: ['A1'],
    },
  },
  createSpreadsheet: {
    valid: {
      title: 'Test Spreadsheet',
      sheets: [
        {
          properties: {
            title: 'Sheet1',
            gridProperties: {
              rowCount: 100,
              columnCount: 26,
            },
          },
        },
      ],
    },
    minimal: {
      title: 'Simple Test',
    },
  },
};

export const testErrors = {
  missingRequired: {
    spreadsheetId: null,
    range: null,
    values: null,
    title: null,
    sheetId: null,
  },
  invalidTypes: {
    spreadsheetId: 123, // should be string
    range: ['A1'], // should be string
    values: 'not an array', // should be array
    sheetId: '123', // should be number
    ranges: 'A1,B2', // should be array
  },
};