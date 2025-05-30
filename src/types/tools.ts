export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    resource?: any;
  }>;
}

export interface GetValuesInput {
  spreadsheetId: string;
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}

export interface UpdateValuesInput {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface AppendValuesInput {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  insertDataOption?: 'OVERWRITE' | 'INSERT_ROWS';
}

export interface ClearValuesInput {
  spreadsheetId: string;
  range: string;
}

export interface BatchGetValuesInput {
  spreadsheetId: string;
  ranges: string[];
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}

export interface BatchUpdateValuesInput {
  spreadsheetId: string;
  data: Array<{
    range: string;
    values: any[][];
  }>;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface CreateSpreadsheetInput {
  title: string;
  sheets?: Array<{
    title?: string;
    rowCount?: number;
    columnCount?: number;
  }>;
}

export interface InsertSheetInput {
  spreadsheetId: string;
  title: string;
  index?: number;
  rowCount?: number;
  columnCount?: number;
}

export interface DeleteSheetInput {
  spreadsheetId: string;
  sheetId: number;
}

export interface DuplicateSheetInput {
  spreadsheetId: string;
  sheetId: number;
  insertSheetIndex?: number;
  newSheetName?: string;
}

export interface UpdateSheetPropertiesInput {
  spreadsheetId: string;
  sheetId: number;
  title?: string;
  gridProperties?: {
    rowCount?: number;
    columnCount?: number;
    frozenRowCount?: number;
    frozenColumnCount?: number;
  };
  tabColor?: {
    red?: number;
    green?: number;
    blue?: number;
  };
}

export interface CopyToInput {
  spreadsheetId: string;
  sheetId: number;
  destinationSpreadsheetId: string;
}

// Formatting types
export interface Color {
  red?: number; // 0-1
  green?: number; // 0-1
  blue?: number; // 0-1
  alpha?: number; // 0-1
}

export interface TextFormat {
  foregroundColor?: Color;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
}

export interface NumberFormat {
  type: 'TEXT' | 'NUMBER' | 'PERCENT' | 'CURRENCY' | 'DATE' | 'TIME' | 'DATE_TIME' | 'SCIENTIFIC';
  pattern?: string;
}

export interface CellFormat {
  backgroundColor?: Color;
  textFormat?: TextFormat;
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  verticalAlignment?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  wrapStrategy?: 'OVERFLOW_CELL' | 'LEGACY_WRAP' | 'CLIP' | 'WRAP';
  numberFormat?: NumberFormat;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface FormatCellsInput {
  spreadsheetId: string;
  range: string;
  format: CellFormat;
}

// Border types
export interface Border {
  style: 'NONE' | 'SOLID' | 'DASHED' | 'DOTTED' | 'SOLID_MEDIUM' | 'SOLID_THICK' | 'DOUBLE';
  color?: Color;
  width?: number;
}

export interface Borders {
  top?: Border;
  bottom?: Border;
  left?: Border;
  right?: Border;
  innerHorizontal?: Border;
  innerVertical?: Border;
}

export interface UpdateBordersInput {
  spreadsheetId: string;
  range: string;
  borders: Borders;
}

// Merge types
export interface MergeCellsInput {
  spreadsheetId: string;
  range: string;
  mergeType: 'MERGE_ALL' | 'MERGE_COLUMNS' | 'MERGE_ROWS';
}

export interface UnmergeCellsInput {
  spreadsheetId: string;
  range: string;
}

// Conditional formatting types
export type ConditionType =
  | 'NUMBER_GREATER'
  | 'NUMBER_GREATER_THAN_EQ'
  | 'NUMBER_LESS'
  | 'NUMBER_LESS_THAN_EQ'
  | 'NUMBER_EQ'
  | 'NUMBER_NOT_EQ'
  | 'NUMBER_BETWEEN'
  | 'NUMBER_NOT_BETWEEN'
  | 'TEXT_CONTAINS'
  | 'TEXT_NOT_CONTAINS'
  | 'TEXT_STARTS_WITH'
  | 'TEXT_ENDS_WITH'
  | 'TEXT_EQ'
  | 'BLANK'
  | 'NOT_BLANK'
  | 'CUSTOM_FORMULA';

export interface BooleanCondition {
  type: ConditionType;
  values?: Array<{
    userEnteredValue?: string;
    relativeDate?: string;
  }>;
}

export interface ConditionalFormatRule {
  ranges: string[];
  booleanRule?: {
    condition: BooleanCondition;
    format: CellFormat;
  };
  gradientRule?: {
    minpoint: {
      color: Color;
      type: 'MIN' | 'NUMBER' | 'PERCENT' | 'PERCENTILE';
      value?: string;
    };
    maxpoint: {
      color: Color;
      type: 'MAX' | 'NUMBER' | 'PERCENT' | 'PERCENTILE';
      value?: string;
    };
    midpoint?: {
      color: Color;
      type: 'NUMBER' | 'PERCENT' | 'PERCENTILE';
      value?: string;
    };
  };
}

export interface AddConditionalFormattingInput {
  spreadsheetId: string;
  rules: ConditionalFormatRule[];
}
