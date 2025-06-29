export const ERROR_MESSAGES = {
  // Validation errors
  REQUIRED_STRING: (field: string) => `${field} is required and must be a string`,
  REQUIRED_NUMBER: (field: string) => `${field} is required and must be a number`,
  REQUIRED_ARRAY: (field: string) => `${field} is required and must be a non-empty array`,
  REQUIRED_OBJECT: (field: string) => `${field} is required and must be an object`,
  REQUIRED_POSITIVE: (field: string) => `${field} must be a positive number`,
  REQUIRED_NON_NEGATIVE: (field: string) => `${field} must be a non-negative number`,

  // Range errors
  INVALID_RANGE: 'Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")',
  RANGE_REQUIRED: 'range is required and must be a string',

  // Spreadsheet errors
  SPREADSHEET_ID_REQUIRED: 'spreadsheetId is required and must be a string',
  SHEET_ID_REQUIRED: 'sheetId is required and must be a number',

  // Value errors
  VALUES_REQUIRED: 'values is required and must be an array',
  VALUES_MUST_BE_2D: 'values must be a 2D array',

  // Authentication/permission errors
  AUTH_FAILED: 'Authentication failed',
  PERMISSION_DENIED: 'Permission denied',
  NOT_FOUND: 'Spreadsheet or range not found',

  // Type-specific errors
  INVALID_MAJOR_DIMENSION: 'majorDimension must be either "ROWS" or "COLUMNS"',
  INVALID_VALUE_RENDER_OPTION:
    'valueRenderOption must be one of: FORMATTED_VALUE, UNFORMATTED_VALUE, or FORMULA',
  INVALID_VALUE_INPUT_OPTION: 'valueInputOption must be either "RAW" or "USER_ENTERED"',
  INVALID_INSERT_DATA_OPTION: 'insertDataOption must be either "OVERWRITE" or "INSERT_ROWS"',
  INVALID_MERGE_TYPE: 'mergeType must be one of: MERGE_ALL, MERGE_COLUMNS, or MERGE_ROWS',

  // Format errors
  INVALID_COLOR_VALUE: (color: string) => `${color} color value must be between 0 and 1`,
  INVALID_FORMAT: 'format must be an object',
  INVALID_BORDERS: 'borders must be an object',

  // Batch operation errors
  BATCH_DATA_REQUIRED: 'data is required and must be a non-empty array',
  BATCH_RANGES_REQUIRED: 'ranges is required and must be a non-empty array',

  // Sheet operation errors
  TITLE_REQUIRED: 'title is required and must be a string',
  INVALID_INDEX: 'index must be a non-negative number',
  INVALID_SHEET_TYPE: 'sheetType must be either "GRID" or "OBJECT"',

  // Dimension errors
  INVALID_DIMENSION: 'dimension must be either "ROWS" or "COLUMNS"',
  INVALID_START_INDEX: 'startIndex must be a non-negative number',
  INVALID_END_INDEX: 'endIndex must be greater than startIndex',

  // Find/replace errors
  FIND_VALUE_REQUIRED: 'find is required and must be a string',
  REPLACE_VALUE_REQUIRED: 'replacement is required and must be a string',

  // Conditional formatting errors
  INVALID_CONDITION_TYPE: 'Invalid condition type',
  CONDITION_VALUES_REQUIRED: 'Condition values are required for this condition type',

  // Batch operation errors (additional)
  SHEET_IDS_REQUIRED: 'sheetIds is required and must be a non-empty array',
  FORMAT_REQUESTS_REQUIRED: 'formatRequests is required and must be a non-empty array',

  // Chart errors
  CHART_ID_REQUIRED: 'chartId is required and must be a number',
  CHART_TYPE_REQUIRED: 'chartType is required and must be a valid chart type',
  CHART_POSITION_REQUIRED: 'position is required and must be an object',
  CHART_SERIES_REQUIRED: 'series is required and must be a non-empty array',
  INVALID_CHART_TYPE:
    'Invalid chart type. Must be one of: COLUMN, BAR, LINE, AREA, PIE, SCATTER, COMBO, HISTOGRAM, CANDLESTICK, WATERFALL',
  INVALID_AXIS_POSITION: 'targetAxis must be either "LEFT_AXIS" or "RIGHT_AXIS"',
  INVALID_LEGEND_POSITION:
    'legend position must be one of: BOTTOM_LEGEND, LEFT_LEGEND, RIGHT_LEGEND, TOP_LEGEND, NO_LEGEND',
  INVALID_TEXT_POSITION: 'textPosition must be one of: NEXT_TO_AXIS, LOW, HIGH, NONE',

  // Generic errors
  INVALID_INPUT: 'Invalid input provided',
  OPERATION_FAILED: 'Operation failed',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;
