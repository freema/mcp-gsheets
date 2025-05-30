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
  // Pattern for A1 notation: letters followed by numbers, optionally colon and more letters with numbers
  // E.g.: A1, A1:B10, AA1:ZZ999
  return /^[A-Z]+[0-9]+(?::[A-Z]+[0-9]+)?$/i.test(cellRange);
}

export function validateGetValuesInput(input: any): GetValuesInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    majorDimension: input.majorDimension || 'ROWS',
    valueRenderOption: input.valueRenderOption || 'FORMATTED_VALUE',
  };
}

export function validateUpdateValuesInput(input: any): UpdateValuesInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!input.values || !Array.isArray(input.values)) {
    throw new Error('values is required and must be an array');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    values: input.values,
    valueInputOption: input.valueInputOption || 'USER_ENTERED',
  };
}

export function validateAppendValuesInput(input: any): AppendValuesInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!input.values || !Array.isArray(input.values)) {
    throw new Error('values is required and must be an array');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    values: input.values,
    valueInputOption: input.valueInputOption || 'USER_ENTERED',
    insertDataOption: input.insertDataOption || 'OVERWRITE',
  };
}

export function validateClearValuesInput(input: any): ClearValuesInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
  };
}

export function validateBatchGetValuesInput(input: any): BatchGetValuesInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.ranges || !Array.isArray(input.ranges) || input.ranges.length === 0) {
    throw new Error('ranges is required and must be a non-empty array');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

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
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.data || !Array.isArray(input.data) || input.data.length === 0) {
    throw new Error('data is required and must be a non-empty array');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

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
  if (!input.title || typeof input.title !== 'string') {
    throw new Error('title is required and must be a string');
  }

  return {
    title: input.title,
    sheets: input.sheets,
  };
}

export function validateInsertSheetInput(input: any): InsertSheetInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.title || typeof input.title !== 'string') {
    throw new Error('title is required and must be a string');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    title: input.title,
    index: input.index,
    rowCount: input.rowCount || 1000,
    columnCount: input.columnCount || 26,
  };
}

export function validateDeleteSheetInput(input: any): DeleteSheetInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (input.sheetId === undefined || typeof input.sheetId !== 'number') {
    throw new Error('sheetId is required and must be a number');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    sheetId: input.sheetId,
  };
}

export function validateDuplicateSheetInput(input: any): DuplicateSheetInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (input.sheetId === undefined || typeof input.sheetId !== 'number') {
    throw new Error('sheetId is required and must be a number');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    sheetId: input.sheetId,
    insertSheetIndex: input.insertSheetIndex,
    newSheetName: input.newSheetName,
  };
}

export function validateUpdateSheetPropertiesInput(input: any): UpdateSheetPropertiesInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (input.sheetId === undefined || typeof input.sheetId !== 'number') {
    throw new Error('sheetId is required and must be a number');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    sheetId: input.sheetId,
    title: input.title,
    gridProperties: input.gridProperties,
    tabColor: input.tabColor,
  };
}

export function validateCopyToInput(input: any): CopyToInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (input.sheetId === undefined || typeof input.sheetId !== 'number') {
    throw new Error('sheetId is required and must be a number');
  }

  if (!input.destinationSpreadsheetId || typeof input.destinationSpreadsheetId !== 'string') {
    throw new Error('destinationSpreadsheetId is required and must be a string');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

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
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!input.format || typeof input.format !== 'object') {
    throw new Error('format is required and must be an object');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    format: input.format,
  };
}

export function validateUpdateBordersInput(input: any): UpdateBordersInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!input.borders || typeof input.borders !== 'object') {
    throw new Error('borders is required and must be an object');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    borders: input.borders,
  };
}

export function validateMergeCellsInput(input: any): MergeCellsInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!input.mergeType || typeof input.mergeType !== 'string') {
    throw new Error('mergeType is required and must be a string');
  }

  const validMergeTypes = ['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'];
  if (!validMergeTypes.includes(input.mergeType)) {
    throw new Error(`Invalid mergeType. Must be one of: ${validMergeTypes.join(', ')}`);
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
    mergeType: input.mergeType,
  };
}

export function validateUnmergeCellsInput(input: any): UnmergeCellsInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.range || typeof input.range !== 'string') {
    throw new Error('range is required and must be a string');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

  if (!validateRange(input.range)) {
    throw new Error('Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")');
  }

  return {
    spreadsheetId: input.spreadsheetId,
    range: input.range,
  };
}

export function validateAddConditionalFormattingInput(input: any): AddConditionalFormattingInput {
  if (!input.spreadsheetId || typeof input.spreadsheetId !== 'string') {
    throw new Error('spreadsheetId is required and must be a string');
  }

  if (!input.rules || !Array.isArray(input.rules) || input.rules.length === 0) {
    throw new Error('rules is required and must be a non-empty array');
  }

  if (!validateSpreadsheetId(input.spreadsheetId)) {
    throw new Error('Invalid spreadsheet ID format');
  }

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
