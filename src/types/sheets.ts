export interface SpreadsheetRange {
  spreadsheetId: string;
  range: string;
}

export interface ValueRange {
  range?: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  values?: any[][];
}

export interface UpdateValuesRequest extends SpreadsheetRange {
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface BatchUpdateRequest {
  spreadsheetId: string;
  data: ValueRange[];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  includeValuesInResponse?: boolean;
  responseValueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}

export interface SheetProperties {
  sheetId?: number;
  title?: string;
  index?: number;
  sheetType?: 'GRID' | 'OBJECT';
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
    alpha?: number;
  };
}

export interface CreateSpreadsheetRequest {
  title?: string;
  sheets?: Array<{
    properties?: SheetProperties;
  }>;
}
