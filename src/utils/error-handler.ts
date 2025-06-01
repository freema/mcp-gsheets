import { ToolResponse } from '../types/tools.js';

export function handleError(error: any): ToolResponse {
  console.error('Error in Google Sheets operation:', error);

  let errorMessage = 'An unexpected error occurred';
  let helpText = '';

  if (!error) {
    errorMessage = 'An unknown error occurred';
  } else if (error.code === 401) {
    errorMessage = 'Authentication failed';
    helpText = 'Please check that your service account credentials are valid.';
  } else if (error.code === 403) {
    errorMessage = 'Permission denied';
    helpText =
      'Please ensure the service account has access to the spreadsheet. ' +
      'Share the spreadsheet with the service account email address.';
  } else if (error.code === 404) {
    errorMessage = 'Spreadsheet or range not found';
    helpText =
      'Please check that the spreadsheet ID and range are correct. ' +
      'The spreadsheet ID can be found in the URL: ' +
      'https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit';
  } else if (error.code === 429) {
    errorMessage = 'Rate limit exceeded';
    helpText = 'Too many requests. Please wait a moment and try again.';
  } else if (error.code === 400) {
    errorMessage = 'Invalid request';
    helpText = error.message || 'Please check your input parameters.';
  } else if (error.message) {
    errorMessage = error.message;
  }

  const fullMessage = helpText ? `${errorMessage}\n\n${helpText}` : errorMessage;

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${fullMessage}`,
      },
    ],
  };
}

export function isRetriableError(error: any): boolean {
  if (!error?.code) {
    return false;
  }
  const retriableCodes = [429, 500, 502, 503, 504];
  return retriableCodes.includes(error.code);
}

export class GoogleSheetsError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'GoogleSheetsError';
  }
}
