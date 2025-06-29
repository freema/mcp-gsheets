import {
  MajorDimension,
  ValueInputOption,
  ValueRenderOption,
  GridProperties,
  TabColor,
  RangeRequestFields,
} from './common.js';

export interface SpreadsheetRange extends RangeRequestFields {}

export interface ValueRange {
  range?: string;
  majorDimension?: MajorDimension;
  values?: any[][];
}

export interface UpdateValuesRequest extends SpreadsheetRange {
  values: any[][];
  valueInputOption?: ValueInputOption;
}

export interface BatchUpdateRequest {
  spreadsheetId: string;
  data: ValueRange[];
  valueInputOption?: ValueInputOption;
  includeValuesInResponse?: boolean;
  responseValueRenderOption?: ValueRenderOption;
}

export interface SheetProperties {
  sheetId?: number;
  title?: string;
  index?: number;
  sheetType?: 'GRID' | 'OBJECT';
  gridProperties?: GridProperties;
  tabColor?: TabColor;
}

export interface CreateSpreadsheetRequest {
  title?: string;
  sheets?: Array<{
    properties?: SheetProperties;
  }>;
}
