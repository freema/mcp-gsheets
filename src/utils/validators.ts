import {
  GetValuesInput,
  UpdateValuesInput,
  AppendValuesInput,
  ClearValuesInput,
  BatchGetValuesInput,
  BatchUpdateValuesInput,
  CreateSpreadsheetInput,
  InsertSheetInput,
  DeleteSheetInput,
  DuplicateSheetInput,
  UpdateSheetPropertiesInput,
  CopyToInput,
  FormatCellsInput,
  UpdateBordersInput,
  MergeCellsInput,
  UnmergeCellsInput,
  AddConditionalFormattingInput,
} from '../types/tools.js';

// Helper validation functions to eliminate duplication
function validateRequiredString(value: any, fieldName: string): void {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} is required and must be a string`);
  }
}

function validateSpreadsheetIdField(id: any): void {
  validateRequiredString(id, 'spreadsheetId');
  if (!validateSpreadsheetId(id)) {
    throw new Error('Invalid spreadsheet ID format');
  }
}

function validateRangeField(range: any): void {
  validateRequiredString(range, 'range');
  if (!validateRange(range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }
}

function validateSheetIdField(sheetId: any): void {
  if (sheetId === undefined || typeof sheetId !== 'number') {
    throw new Error('sheetId is required and must be a number');
  }
}

function validateValuesArray(values: any): void {
  if (!values || !Array.isArray(values)) {
    throw new Error('values is required and must be an array');
  }
}

function validateNonEmptyArray(array: any, fieldName: string): void {
  if (!array || !Array.isArray(array) || array.length === 0) {
    throw new Error(`${fieldName} is required and must be a non-empty array`);
  }
}

function validateRequiredObject(value: any, fieldName: string): void {
  if (!value || typeof value !== 'object') {
    throw new Error(`${fieldName} is required and must be an object`);
  }
}

export function validateSpreadsheetId(id: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(id);
}

export function validateRange(range: string): boolean {
  // Split into sheet name part and range part
  const parts = range.split('!');

  if (parts.length > 2) {
    return false; // More than one exclamation mark
  }

  if (parts.length === 2) {
    // Has sheet name
    const sheetName = parts[0];
    const cellRange = parts[1];

    // Sheet name can contain anything except empty string
    if (!sheetName || sheetName.trim() === '') {
      return false;
    }

    // Check cell range
    return cellRange ? isValidCellRange(cellRange) : false;
  } else {
    // No sheet name, just range
    const cellRange = parts[0];
    return cellRange ? isValidCellRange(cellRange) : false;
  }
}

// Helper function to validate cell range
function isValidCellRange(cellRange: string): boolean {
  // Pattern for A1 notation including:
  // - A1, A1:B10 (standard ranges)
  // - A:A, A:Z (full columns)
  // - 1:1, 1:100 (full rows)
  // - A1:B (mixed ranges)
  const patterns = [
    /^[A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?$/i, // A1 or A1:B10
    /^[A-Z]+:[A-Z]+$/i, // A:A or A:Z
    /^[0-9]+:[0-9]+$/i, // 1:1 or 1:100
    /^[A-Z]+[0-9]+:[A-Z]+$/i, // A1:B
    /^[A-Z]+:[A-Z]+[0-9]+$/i, // A:B10
  ];

  return patterns.some((pattern) => pattern.test(cellRange));
}

export function validateGetValuesInput(input: any): GetValuesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    majorDimension: input.majorDimension || 'ROWS',
    valueRenderOption: input.valueRenderOption || 'FORMATTED_VALUE',
  };
}

export function validateUpdateValuesInput(input: any): UpdateValuesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);
  validateValuesArray(input.values);

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    values: input.values,
    valueInputOption: input.valueInputOption || 'USER_ENTERED',
  };
}

export function validateAppendValuesInput(input: any): AppendValuesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);
  validateValuesArray(input.values);

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    values: input.values,
    valueInputOption: input.valueInputOption || 'USER_ENTERED',
    insertDataOption: input.insertDataOption || 'OVERWRITE',
  };
}

export function validateClearValuesInput(input: any): ClearValuesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
  };
}

export function validateBatchGetValuesInput(input: any): BatchGetValuesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateNonEmptyArray(input.ranges, 'ranges');

  for (const range of input.ranges) {
    if (!validateRange(range)) {
      throw new Error(`Invalid range format: ${range}. Use A1 notation (e.g., "Sheet1!A1:B10")`);
    }
  }

  return {
    spreadsheetId: input.spreadsheetId,
    ranges: input.ranges,
    majorDimension: input.majorDimension || 'ROWS',
    valueRenderOption: input.valueRenderOption || 'FORMATTED_VALUE',
  };
}

export function validateBatchUpdateValuesInput(input: any): BatchUpdateValuesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateNonEmptyArray(input.data, 'data');

  for (const item of input.data) {
    if (!item.range || !item.values) {
      throw new Error('Each data item must have range and values properties');
    }
    if (!validateRange(item.range)) {
      throw new Error(
        `Invalid range format: ${item.range}. Use A1 notation (e.g., "Sheet1!A1:B10")`
      );
    }
  }

  return {
    spreadsheetId: input.spreadsheetId,
    data: input.data,
    valueInputOption: input.valueInputOption || 'USER_ENTERED',
  };
}

export function validateCreateSpreadsheetInput(input: any): CreateSpreadsheetInput {
  validateRequiredString(input.title, 'title');

  return {
    title: input.title,
    sheets: input.sheets,
  };
}

export function validateInsertSheetInput(input: any): InsertSheetInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRequiredString(input.title, 'title');

  return {
    spreadsheetId: input.spreadsheetId,
    title: input.title,
    index: input.index,
    rowCount: input.rowCount || 1000,
    columnCount: input.columnCount || 26,
  };
}

export function validateDeleteSheetInput(input: any): DeleteSheetInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateSheetIdField(input.sheetId);

  return {
    spreadsheetId: input.spreadsheetId,
    sheetId: input.sheetId,
  };
}

export function validateDuplicateSheetInput(input: any): DuplicateSheetInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateSheetIdField(input.sheetId);

  return {
    spreadsheetId: input.spreadsheetId,
    sheetId: input.sheetId,
    insertSheetIndex: input.insertSheetIndex,
    newSheetName: input.newSheetName,
  };
}

export function validateUpdateSheetPropertiesInput(input: any): UpdateSheetPropertiesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateSheetIdField(input.sheetId);

  return {
    spreadsheetId: input.spreadsheetId,
    sheetId: input.sheetId,
    title: input.title,
    gridProperties: input.gridProperties,
    tabColor: input.tabColor,
  };
}

export function validateCopyToInput(input: any): CopyToInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateSheetIdField(input.sheetId);
  validateRequiredString(input.destinationSpreadsheetId, 'destinationSpreadsheetId');

  if (!validateSpreadsheetId(input.destinationSpreadsheetId)) {
    throw new Error('Invalid destination spreadsheet ID format');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    sheetId: input.sheetId,
    destinationSpreadsheetId: input.destinationSpreadsheetId,
  };
}

export function validateFormatCellsInput(input: any): FormatCellsInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);
  validateRequiredObject(input.format, 'format');

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    format: input.format,
  };
}

export function validateUpdateBordersInput(input: any): UpdateBordersInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);
  validateRequiredObject(input.borders, 'borders');

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    borders: input.borders,
  };
}

export function validateMergeCellsInput(input: any): MergeCellsInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);
  validateRequiredString(input.mergeType, 'mergeType');

  const validMergeTypes = ['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'];
  if (!validMergeTypes.includes(input.mergeType)) {
    throw new Error(`Invalid mergeType. Must be one of: ${validMergeTypes.join(', ')}`);
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    mergeType: input.mergeType,
  };
}

export function validateUnmergeCellsInput(input: any): UnmergeCellsInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateRangeField(input.range);

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
  };
}

export function validateAddConditionalFormattingInput(input: any): AddConditionalFormattingInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateNonEmptyArray(input.rules, 'rules');

  for (const rule of input.rules) {
    if (!rule.ranges || !Array.isArray(rule.ranges) || rule.ranges.length === 0) {
      throw new Error('Each rule must have a non-empty ranges array');
    }

    for (const range of rule.ranges) {
      if (!validateRange(range)) {
        throw new Error(`Invalid range format: ${range}. Use A1 notation (e.g., "Sheet1!A1:B10")`);
      }
    }

    if (!rule.booleanRule && !rule.gradientRule) {
      throw new Error('Each rule must have either booleanRule or gradientRule');
    }
  }

  return {
    spreadsheetId: input.spreadsheetId,
    rules: input.rules,
  };
}
