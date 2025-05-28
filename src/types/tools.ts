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
