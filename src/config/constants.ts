export const GOOGLE_SHEETS_API_VERSION = 'v4';
export const GOOGLE_SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
};

export const BATCH_LIMITS = {
  maxRangesPerBatchGet: 100,
  maxUpdatesPerBatch: 100,
  maxValuesPerUpdate: 10000,
};

export const VALUE_INPUT_OPTIONS = {
  RAW: 'RAW',
  USER_ENTERED: 'USER_ENTERED',
} as const;

export const VALUE_RENDER_OPTIONS = {
  FORMATTED_VALUE: 'FORMATTED_VALUE',
  UNFORMATTED_VALUE: 'UNFORMATTED_VALUE',
  FORMULA: 'FORMULA',
} as const;

export const MAJOR_DIMENSIONS = {
  ROWS: 'ROWS',
  COLUMNS: 'COLUMNS',
} as const;
