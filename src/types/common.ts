export type MajorDimension = 'ROWS' | 'COLUMNS';
export type ValueRenderOption = 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
export type ValueInputOption = 'RAW' | 'USER_ENTERED';
export type DateTimeRenderOption = 'SERIAL_NUMBER' | 'FORMATTED_STRING';
export type InsertDataOption = 'OVERWRITE' | 'INSERT_ROWS';

export interface GridProperties {
  rowCount?: number;
  columnCount?: number;
  frozenRowCount?: number;
  frozenColumnCount?: number;
}

export interface Color {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

export interface TabColor extends Color {}

export interface CellFormat {
  numberFormat?: {
    type: string;
    pattern?: string;
  };
  backgroundColor?: Color;
  borders?: {
    top?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
    right?: BorderStyle;
  };
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  verticalAlignment?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  wrapStrategy?: 'OVERFLOW_CELL' | 'LEGACY_WRAP' | 'CLIP' | 'WRAP';
  textDirection?: 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';
  textFormat?: {
    foregroundColor?: Color;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    foregroundColorStyle?: ColorStyle;
  };
  hyperlinkDisplayType?: 'LINKED' | 'PLAIN_TEXT';
  textRotation?: {
    angle?: number;
    vertical?: boolean;
  };
  backgroundColorStyle?: ColorStyle;
}

export interface BorderStyle {
  style: 'NONE' | 'DOTTED' | 'DASHED' | 'SOLID' | 'SOLID_MEDIUM' | 'SOLID_THICK' | 'DOUBLE';
  color?: Color;
  colorStyle?: ColorStyle;
}

export interface ColorStyle {
  rgbColor?: Color;
  themeColor?:
    | 'TEXT'
    | 'BACKGROUND'
    | 'ACCENT1'
    | 'ACCENT2'
    | 'ACCENT3'
    | 'ACCENT4'
    | 'ACCENT5'
    | 'ACCENT6'
    | 'LINK';
}

export interface GridRange {
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface DimensionRange {
  sheetId?: number;
  dimension: 'ROWS' | 'COLUMNS';
  startIndex?: number;
  endIndex?: number;
}

export interface FindReplaceRange {
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface CommonRequestFields {
  spreadsheetId: string;
}

export interface RangeRequestFields extends CommonRequestFields {
  range: string;
}

export interface SheetRequestFields extends CommonRequestFields {
  sheetId: number;
}

export interface ValueRenderRequestFields {
  valueRenderOption?: ValueRenderOption;
  dateTimeRenderOption?: DateTimeRenderOption;
}

export interface ValueInputRequestFields {
  valueInputOption?: ValueInputOption;
}

export interface DimensionRequestFields {
  majorDimension?: MajorDimension;
}
