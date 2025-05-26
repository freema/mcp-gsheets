import { ToolResponse } from '../types/tools.js';

export function formatSuccessResponse(data: any, message?: string): ToolResponse {
  const content = message ? `${message}\n\n${JSON.stringify(data, null, 2)}` : JSON.stringify(data, null, 2);
  
  return {
    content: [{
      type: 'text',
      text: content
    }]
  };
}

export function formatValuesResponse(values: any[][], range?: string): ToolResponse {
  if (!values || values.length === 0) {
    return {
      content: [{
        type: 'text',
        text: range ? `No data found in range: ${range}` : 'No data found'
      }]
    };
  }
  
  const formattedData = {
    range: range,
    rowCount: values.length,
    columnCount: values[0]?.length || 0,
    values: values
  };
  
  return formatSuccessResponse(formattedData);
}

export function formatBatchValuesResponse(valueRanges: any[]): ToolResponse {
  const formattedData = valueRanges.map(vr => ({
    range: vr.range,
    rowCount: vr.values?.length || 0,
    columnCount: vr.values?.[0]?.length || 0,
    values: vr.values || []
  }));
  
  return formatSuccessResponse({
    totalRanges: valueRanges.length,
    valueRanges: formattedData
  });
}

export function formatSpreadsheetMetadata(metadata: any): ToolResponse {
  const formattedData = {
    spreadsheetId: metadata.spreadsheetId,
    title: metadata.properties?.title,
    locale: metadata.properties?.locale,
    timeZone: metadata.properties?.timeZone,
    sheets: metadata.sheets?.map((sheet: any) => ({
      sheetId: sheet.properties?.sheetId,
      title: sheet.properties?.title,
      index: sheet.properties?.index,
      rowCount: sheet.properties?.gridProperties?.rowCount,
      columnCount: sheet.properties?.gridProperties?.columnCount,
      tabColor: sheet.properties?.tabColor
    }))
  };
  
  return formatSuccessResponse(formattedData);
}

export function formatUpdateResponse(updatedCells: number, updatedRange?: string): ToolResponse {
  const message = updatedRange 
    ? `Successfully updated ${updatedCells} cells in range: ${updatedRange}`
    : `Successfully updated ${updatedCells} cells`;
    
  return {
    content: [{
      type: 'text',
      text: message
    }]
  };
}

export function formatAppendResponse(updates: any): ToolResponse {
  return {
    content: [{
      type: 'text',
      text: `Successfully appended ${updates.updatedCells || 0} cells to range: ${updates.updatedRange}`
    }]
  };
}

export function formatClearResponse(clearedRange: string): ToolResponse {
  return {
    content: [{
      type: 'text',
      text: `Successfully cleared range: ${clearedRange}`
    }]
  };
}

export function formatSpreadsheetCreatedResponse(spreadsheet: any): ToolResponse {
  return formatSuccessResponse({
    spreadsheetId: spreadsheet.spreadsheetId,
    spreadsheetUrl: spreadsheet.spreadsheetUrl,
    title: spreadsheet.properties?.title
  }, 'Spreadsheet created successfully');
}

export function formatSheetOperationResponse(operation: string, details?: any): ToolResponse {
  return {
    content: [{
      type: 'text',
      text: `${operation} completed successfully${details ? ': ' + JSON.stringify(details, null, 2) : ''}`
    }]
  };
}