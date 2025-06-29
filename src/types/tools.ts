import {
  InsertDataOption,
  GridProperties,
  TabColor,
  Color as CommonColor,
  CellFormat as CommonCellFormat,
  BorderStyle,
  RangeRequestFields,
  SheetRequestFields,
  ValueRenderRequestFields,
  ValueInputRequestFields,
  DimensionRequestFields,
} from './common.js';

export interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    resource?: any;
  }>;
}

export interface GetValuesInput
  extends RangeRequestFields,
    DimensionRequestFields,
    ValueRenderRequestFields {}

export interface UpdateValuesInput extends RangeRequestFields, ValueInputRequestFields {
  values: any[][];
}

export interface AppendValuesInput extends RangeRequestFields, ValueInputRequestFields {
  values: any[][];
  insertDataOption?: InsertDataOption;
}

export interface ClearValuesInput extends RangeRequestFields {}

export interface BatchGetValuesInput extends DimensionRequestFields, ValueRenderRequestFields {
  spreadsheetId: string;
  ranges: string[];
}

export interface BatchUpdateValuesInput extends ValueInputRequestFields {
  spreadsheetId: string;
  data: Array<{
    range: string;
    values: any[][];
  }>;
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

export interface UpdateSheetPropertiesInput extends SheetRequestFields {
  title?: string;
  gridProperties?: GridProperties;
  tabColor?: TabColor;
}

export interface CopyToInput {
  spreadsheetId: string;
  sheetId: number;
  destinationSpreadsheetId: string;
}

// Re-export Color from common for backward compatibility
export type Color = CommonColor;

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

// Re-export CellFormat from common for backward compatibility
export type CellFormat = CommonCellFormat;

export interface FormatCellsInput {
  spreadsheetId: string;
  range: string;
  format: CellFormat;
}

// Border types
export interface Border extends BorderStyle {
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

// Batch operations
export interface BatchDeleteSheetsInput {
  spreadsheetId: string;
  sheetIds: number[];
}

export interface BatchFormatCellsInput {
  spreadsheetId: string;
  formatRequests: Array<{
    range: string;
    format: CellFormat;
  }>;
}

// Chart types
export type ChartType =
  | 'COLUMN'
  | 'BAR'
  | 'LINE'
  | 'AREA'
  | 'PIE'
  | 'SCATTER'
  | 'COMBO'
  | 'HISTOGRAM'
  | 'CANDLESTICK'
  | 'WATERFALL';

export interface ChartPosition {
  overlayPosition: {
    anchorCell: {
      sheetId: number;
      rowIndex: number;
      columnIndex: number;
    };
    offsetXPixels?: number;
    offsetYPixels?: number;
    widthPixels?: number;
    heightPixels?: number;
  };
}

export interface ChartSeries {
  sourceRange: string;
  type?: ChartType;
  targetAxis?: 'LEFT_AXIS' | 'RIGHT_AXIS';
}

export interface ChartAxis {
  title?: string;
  format?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontFamily?: string;
  };
  textPosition?: 'NEXT_TO_AXIS' | 'LOW' | 'HIGH' | 'NONE';
}

export interface ChartLegend {
  position?: 'BOTTOM_LEGEND' | 'LEFT_LEGEND' | 'RIGHT_LEGEND' | 'TOP_LEGEND' | 'NO_LEGEND';
  alignment?: 'START' | 'CENTER' | 'END';
  textStyle?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontFamily?: string;
    foregroundColor?: Color;
  };
}

export interface CreateChartInput {
  spreadsheetId: string;
  position: ChartPosition;
  chartType: ChartType;
  title?: string;
  subtitle?: string;
  series: ChartSeries[];
  domainRange?: string; // Optional domain range in A1 notation
  domainAxis?: ChartAxis;
  leftAxis?: ChartAxis;
  rightAxis?: ChartAxis;
  legend?: ChartLegend;
  backgroundColor?: Color;
  altText?: string;
}

export interface UpdateChartInput {
  spreadsheetId: string;
  chartId: number;
  position?: ChartPosition;
  chartType?: ChartType;
  title?: string;
  subtitle?: string;
  series?: ChartSeries[];
  domainAxis?: ChartAxis;
  leftAxis?: ChartAxis;
  rightAxis?: ChartAxis;
  legend?: ChartLegend;
  backgroundColor?: Color;
  altText?: string;
}

export interface DeleteChartInput {
  spreadsheetId: string;
  chartId: number;
}
