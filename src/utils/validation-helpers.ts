import { ERROR_MESSAGES } from './error-messages.js';
import { validateSpreadsheetId, validateRange } from './validators.js';

/**
 * Common validation fields that can be used with withCommonValidation
 */
export type ValidationField =
  | 'spreadsheetId'
  | 'range'
  | 'sheetId'
  | 'values'
  | 'title'
  | 'ranges'
  | 'data';

/**
 * Interface for validation configuration
 */
export interface ValidationConfig {
  requiredFields?: ValidationField[];
  defaults?: Record<string, any>;
}

/**
 * Higher-order function that adds common validation to any validator function
 */
export function withCommonValidation<T>(
  validator: (input: any) => T,
  config: ValidationConfig
): (input: any) => T {
  return (input: any): T => {
    // Validate required fields
    if (config.requiredFields) {
      for (const field of config.requiredFields) {
        validateField(input, field);
      }
    }

    // Apply defaults
    if (config.defaults) {
      const enrichedInput = { ...input };
      for (const [key, value] of Object.entries(config.defaults)) {
        if (enrichedInput[key] === undefined) {
          enrichedInput[key] = value;
        }
      }
      return validator(enrichedInput);
    }

    return validator(input);
  };
}

/**
 * Validates a specific field based on its type
 */
function validateField(input: any, field: ValidationField): void {
  switch (field) {
    case 'spreadsheetId':
      if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
        throw new Error(ERROR_MESSAGES.SPREADSHEET_ID_REQUIRED);
      }
      if (!validateSpreadsheetId(input.spreadsheetId)) {
        throw new Error('Invalid spreadsheet ID format');
      }
      break;

    case 'range':
      if (!input.range || typeof input.range !== 'string') {
        throw new Error(ERROR_MESSAGES.REQUIRED_STRING('range'));
      }
      if (!validateRange(input.range)) {
        throw new Error(ERROR_MESSAGES.INVALID_RANGE);
      }
      break;

    case 'sheetId':
      if (input.sheetId === undefined || typeof input.sheetId !== 'number') {
        throw new Error(ERROR_MESSAGES.SHEET_ID_REQUIRED);
      }
      break;

    case 'values':
      if (!input.values || !Array.isArray(input.values)) {
        throw new Error(ERROR_MESSAGES.VALUES_REQUIRED);
      }
      break;

    case 'title':
      if (!input.title || typeof input.title !== 'string') {
        throw new Error(ERROR_MESSAGES.TITLE_REQUIRED);
      }
      break;

    case 'ranges':
      if (!input.ranges || !Array.isArray(input.ranges) || input.ranges.length === 0) {
        throw new Error(ERROR_MESSAGES.BATCH_RANGES_REQUIRED);
      }
      for (const range of input.ranges) {
        if (!validateRange(range)) {
          throw new Error(`Invalid range format: ${range}. ${ERROR_MESSAGES.INVALID_RANGE}`);
        }
      }
      break;

    case 'data':
      if (!input.data || !Array.isArray(input.data) || input.data.length === 0) {
        throw new Error(ERROR_MESSAGES.BATCH_DATA_REQUIRED);
      }
      for (const item of input.data) {
        if (!item.range || !item.values) {
          throw new Error('Each data item must have range and values properties');
        }
        if (!validateRange(item.range)) {
          throw new Error(`Invalid range format: ${item.range}. ${ERROR_MESSAGES.INVALID_RANGE}`);
        }
      }
      break;
  }
}

/**
 * Common default values for Google Sheets API
 */
export const COMMON_DEFAULTS = {
  majorDimension: 'ROWS',
  valueRenderOption: 'FORMATTED_VALUE',
  valueInputOption: 'USER_ENTERED',
  insertDataOption: 'OVERWRITE',
  dateTimeRenderOption: 'SERIAL_NUMBER',
  rowCount: 1000,
  columnCount: 26,
} as const;

/**
 * Creates a validator with common spreadsheet+range validation
 */
export function createRangeValidator<T>(
  additionalValidation?: (input: any) => void,
  defaults?: Record<string, any>
): (input: any) => T {
  return withCommonValidation(
    (input: any): T => {
      if (additionalValidation) {
        additionalValidation(input);
      }
      return input as T;
    },
    {
      requiredFields: ['spreadsheetId', 'range'],
      ...(defaults && { defaults }),
    }
  );
}

/**
 * Creates a validator with common spreadsheet+sheetId validation
 */
export function createSheetValidator<T>(
  additionalValidation?: (input: any) => void,
  defaults?: Record<string, any>
): (input: any) => T {
  return withCommonValidation(
    (input: any): T => {
      if (additionalValidation) {
        additionalValidation(input);
      }
      return input as T;
    },
    {
      requiredFields: ['spreadsheetId', 'sheetId'],
      ...(defaults && { defaults }),
    }
  );
}

/**
 * Validates that a value is within a specific range
 */
export function validateNumberInRange(
  value: number | undefined,
  fieldName: string,
  min: number,
  max: number
): void {
  if (value !== undefined) {
    if (typeof value !== 'number' || value < min || value > max) {
      throw new Error(`${fieldName} must be between ${min} and ${max}`);
    }
  }
}

/**
 * Validates color values (0-1 range)
 */
export function validateColor(color: any, fieldName: string): void {
  if (color !== undefined) {
    if (typeof color !== 'object') {
      throw new Error(`${fieldName} must be an object`);
    }

    const colorFields = ['red', 'green', 'blue', 'alpha'];
    for (const field of colorFields) {
      if (color[field] !== undefined) {
        validateNumberInRange(color[field], `${fieldName}.${field}`, 0, 1);
      }
    }
  }
}

/**
 * Validates enum values
 */
export function validateEnum<T extends string>(
  value: any,
  _fieldName: string,
  validValues: readonly T[],
  errorMessage: string
): void {
  if (value !== undefined && !validValues.includes(value)) {
    throw new Error(errorMessage);
  }
}
