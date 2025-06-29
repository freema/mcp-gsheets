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
  BatchDeleteSheetsInput,
  BatchFormatCellsInput,
  CreateChartInput,
  UpdateChartInput,
  DeleteChartInput,
  ChartType,
} from '../types/tools.js';
import { ERROR_MESSAGES } from './error-messages.js';
import {
  createRangeValidator,
  createSheetValidator,
  COMMON_DEFAULTS,
} from './validation-helpers.js';

// Helper validation functions to eliminate duplication
function validateRequiredString(value: any, fieldName: string): void {
  if (!value || typeof value !== 'string') {
    throw new Error(ERROR_MESSAGES.REQUIRED_STRING(fieldName));
  }
}

function validateSpreadsheetIdField(id: any): void {
  if (!id || typeof id !== 'string') {
    throw new Error(ERROR_MESSAGES.SPREADSHEET_ID_REQUIRED);
  }
  if (!validateSpreadsheetId(id)) {
    throw new Error('Invalid spreadsheet ID format');
  }
}

function validateRangeField(range: any): void {
  if (!range || typeof range !== 'string') {
    throw new Error(ERROR_MESSAGES.RANGE_REQUIRED);
  }
  if (!validateRange(range)) {
    throw new Error(ERROR_MESSAGES.INVALID_RANGE);
  }
}

function validateSheetIdField(sheetId: any): void {
  if (sheetId === undefined || typeof sheetId !== 'number') {
    throw new Error(ERROR_MESSAGES.SHEET_ID_REQUIRED);
  }
}

function validateValuesArray(values: any): void {
  if (!values || !Array.isArray(values)) {
    throw new Error(ERROR_MESSAGES.VALUES_REQUIRED);
  }
}

function validateNonEmptyArray(array: any, fieldName: string): void {
  if (!array || !Array.isArray(array) || array.length === 0) {
    throw new Error(ERROR_MESSAGES.REQUIRED_ARRAY(fieldName));
  }
}

function validateRequiredObject(value: any, fieldName: string): void {
  if (!value || typeof value !== 'object') {
    throw new Error(ERROR_MESSAGES.REQUIRED_OBJECT(fieldName));
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

export const validateGetValuesInput = createRangeValidator<GetValuesInput>(undefined, {
  majorDimension: COMMON_DEFAULTS.majorDimension,
  valueRenderOption: COMMON_DEFAULTS.valueRenderOption,
});

export const validateUpdateValuesInput = createRangeValidator<UpdateValuesInput>(
  (input) => validateValuesArray(input.values),
  {
    valueInputOption: COMMON_DEFAULTS.valueInputOption,
  }
);

export const validateAppendValuesInput = createRangeValidator<AppendValuesInput>(
  (input) => validateValuesArray(input.values),
  {
    valueInputOption: COMMON_DEFAULTS.valueInputOption,
    insertDataOption: COMMON_DEFAULTS.insertDataOption,
  }
);

export const validateClearValuesInput = createRangeValidator<ClearValuesInput>();

export function validateBatchGetValuesInput(input: any): BatchGetValuesInput {
  validateSpreadsheetIdField(input.spreadsheetId);
  validateNonEmptyArray(input.ranges, 'ranges');

  for (const range of input.ranges) {
    if (!validateRange(range)) {
      throw new Error(`Invalid range format: ${range}. ${ERROR_MESSAGES.INVALID_RANGE}`);
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
      throw new Error(`Invalid range format: ${item.range}. ${ERROR_MESSAGES.INVALID_RANGE}`);
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

export const validateDeleteSheetInput = createSheetValidator<DeleteSheetInput>();

export const validateDuplicateSheetInput = createSheetValidator<DuplicateSheetInput>();

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

export const validateCopyToInput = createSheetValidator<CopyToInput>((input) => {
  validateRequiredString(input.destinationSpreadsheetId, 'destinationSpreadsheetId');
  if (!validateSpreadsheetId(input.destinationSpreadsheetId)) {
    throw new Error('Invalid destination spreadsheet ID format');
  }
});

export const validateFormatCellsInput = createRangeValidator<FormatCellsInput>((input) =>
  validateRequiredObject(input.format, 'format')
);

export const validateUpdateBordersInput = createRangeValidator<UpdateBordersInput>((input) =>
  validateRequiredObject(input.borders, 'borders')
);

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
        throw new Error(`Invalid range format: ${range}. ${ERROR_MESSAGES.INVALID_RANGE}`);
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

// Batch operations validators
export function validateBatchDeleteSheetsInput(input: any): BatchDeleteSheetsInput {
  validateSpreadsheetIdField(input.spreadsheetId);

  if (!input.sheetIds || !Array.isArray(input.sheetIds) || input.sheetIds.length === 0) {
    throw new Error(ERROR_MESSAGES.SHEET_IDS_REQUIRED);
  }

  for (const sheetId of input.sheetIds) {
    if (typeof sheetId !== 'number') {
      throw new Error('Each sheetId must be a number');
    }
  }

  return {
    spreadsheetId: input.spreadsheetId,
    sheetIds: input.sheetIds,
  };
}

export function validateBatchFormatCellsInput(input: any): BatchFormatCellsInput {
  validateSpreadsheetIdField(input.spreadsheetId);

  if (
    !input.formatRequests ||
    !Array.isArray(input.formatRequests) ||
    input.formatRequests.length === 0
  ) {
    throw new Error(ERROR_MESSAGES.FORMAT_REQUESTS_REQUIRED);
  }

  for (const request of input.formatRequests) {
    if (!request.range || typeof request.range !== 'string') {
      throw new Error('Each format request must have a range property');
    }
    if (!validateRange(request.range)) {
      throw new Error(`Invalid range format: ${request.range}. ${ERROR_MESSAGES.INVALID_RANGE}`);
    }
    if (!request.format || typeof request.format !== 'object') {
      throw new Error('Each format request must have a format property');
    }
  }

  return {
    spreadsheetId: input.spreadsheetId,
    formatRequests: input.formatRequests,
  };
}

// Chart validators
const VALID_CHART_TYPES: ChartType[] = [
  'COLUMN',
  'BAR',
  'LINE',
  'AREA',
  'PIE',
  'SCATTER',
  'COMBO',
  'HISTOGRAM',
  'CANDLESTICK',
  'WATERFALL',
];

export function validateCreateChartInput(input: any): CreateChartInput {
  validateSpreadsheetIdField(input.spreadsheetId);

  if (!input.position || typeof input.position !== 'object') {
    throw new Error(ERROR_MESSAGES.CHART_POSITION_REQUIRED);
  }

  if (!input.chartType || typeof input.chartType !== 'string') {
    throw new Error(ERROR_MESSAGES.CHART_TYPE_REQUIRED);
  }

  if (!VALID_CHART_TYPES.includes(input.chartType)) {
    throw new Error(ERROR_MESSAGES.INVALID_CHART_TYPE);
  }

  if (!input.series || !Array.isArray(input.series) || input.series.length === 0) {
    throw new Error(ERROR_MESSAGES.CHART_SERIES_REQUIRED);
  }

  // Validate position structure
  const pos = input.position;
  if (!pos.overlayPosition || typeof pos.overlayPosition !== 'object') {
    throw new Error('position.overlayPosition is required and must be an object');
  }
  if (!pos.overlayPosition.anchorCell || typeof pos.overlayPosition.anchorCell !== 'object') {
    throw new Error('position.overlayPosition.anchorCell is required and must be an object');
  }
  if (typeof pos.overlayPosition.anchorCell.sheetId !== 'number') {
    throw new Error('position.overlayPosition.anchorCell.sheetId is required and must be a number');
  }
  if (typeof pos.overlayPosition.anchorCell.rowIndex !== 'number') {
    throw new Error(
      'position.overlayPosition.anchorCell.rowIndex is required and must be a number'
    );
  }
  if (typeof pos.overlayPosition.anchorCell.columnIndex !== 'number') {
    throw new Error(
      'position.overlayPosition.anchorCell.columnIndex is required and must be a number'
    );
  }

  // Validate series
  for (const series of input.series) {
    if (!series.sourceRange || typeof series.sourceRange !== 'string') {
      throw new Error('Each series must have a sourceRange property');
    }
    if (!validateRange(series.sourceRange)) {
      throw new Error(
        `Invalid series range format: ${series.sourceRange}. ${ERROR_MESSAGES.INVALID_RANGE}`
      );
    }
    if (series.targetAxis && !['LEFT_AXIS', 'RIGHT_AXIS'].includes(series.targetAxis)) {
      throw new Error(ERROR_MESSAGES.INVALID_AXIS_POSITION);
    }
  }

  // Validate domainRange if provided
  if (input.domainRange && !validateRange(input.domainRange)) {
    throw new Error(
      `Invalid domain range format: ${input.domainRange}. ${ERROR_MESSAGES.INVALID_RANGE}`
    );
  }

  return {
    spreadsheetId: input.spreadsheetId,
    position: input.position,
    chartType: input.chartType,
    title: input.title,
    subtitle: input.subtitle,
    series: input.series,
    domainRange: input.domainRange,
    domainAxis: input.domainAxis,
    leftAxis: input.leftAxis,
    rightAxis: input.rightAxis,
    legend: input.legend,
    backgroundColor: input.backgroundColor,
    altText: input.altText,
  };
}

export function validateUpdateChartInput(input: any): UpdateChartInput {
  validateSpreadsheetIdField(input.spreadsheetId);

  if (input.chartId === undefined || typeof input.chartId !== 'number') {
    throw new Error(ERROR_MESSAGES.CHART_ID_REQUIRED);
  }

  if (input.chartType && !VALID_CHART_TYPES.includes(input.chartType)) {
    throw new Error(ERROR_MESSAGES.INVALID_CHART_TYPE);
  }

  // Validate series if provided
  if (input.series) {
    if (!Array.isArray(input.series) || input.series.length === 0) {
      throw new Error(ERROR_MESSAGES.CHART_SERIES_REQUIRED);
    }
    for (const series of input.series) {
      if (!series.sourceRange || typeof series.sourceRange !== 'string') {
        throw new Error('Each series must have a sourceRange property');
      }
      if (!validateRange(series.sourceRange)) {
        throw new Error(
          `Invalid series range format: ${series.sourceRange}. ${ERROR_MESSAGES.INVALID_RANGE}`
        );
      }
      if (series.targetAxis && !['LEFT_AXIS', 'RIGHT_AXIS'].includes(series.targetAxis)) {
        throw new Error(ERROR_MESSAGES.INVALID_AXIS_POSITION);
      }
    }
  }

  return {
    spreadsheetId: input.spreadsheetId,
    chartId: input.chartId,
    position: input.position,
    chartType: input.chartType,
    title: input.title,
    subtitle: input.subtitle,
    series: input.series,
    domainAxis: input.domainAxis,
    leftAxis: input.leftAxis,
    rightAxis: input.rightAxis,
    legend: input.legend,
    backgroundColor: input.backgroundColor,
    altText: input.altText,
  };
}

export function validateDeleteChartInput(input: any): DeleteChartInput {
  validateSpreadsheetIdField(input.spreadsheetId);

  if (input.chartId === undefined || typeof input.chartId !== 'number') {
    throw new Error(ERROR_MESSAGES.CHART_ID_REQUIRED);
  }

  return {
    spreadsheetId: input.spreadsheetId,
    chartId: input.chartId,
  };
}
