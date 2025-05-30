import { ToolResponse } from '../types/tools.js';

export function formatSuccessResponse(data: any, message?: string): ToolResponse {
  const content = message
    ? `${message}\n\n${JSON.stringify(data, null, 2)}`
    : JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: 'text',
        text: content,
      },
    ],
  };
}

export function formatValuesResponse(values: any[][], range?: string): ToolResponse {
  if (!values || values.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: range ? `No data found in range: ${range}` : 'No data found',
        },
      ],
    };
  }

  const formattedData = {
    range: range,
    rowCount: values.length,
    columnCount: values[0] ? values[0].length : 0,
    values: values,
  };

  return formatSuccessResponse(formattedData);
}

export function formatBatchValuesResponse(valueRanges: any[]): ToolResponse {
  const formattedData = valueRanges.map((vr) => ({
    range: vr.range,
    rowCount: vr.values ? vr.values.length : 0,
    columnCount: vr.values?.[0] ? vr.values[0].length : 0,
    values: vr.values || [],
  }));

  return formatSuccessResponse({
    totalRanges: valueRanges.length,
    valueRanges: formattedData,
  });
}

export function formatSpreadsheetMetadata(metadata: any): ToolResponse {
  const formattedData = {
    spreadsheetId: metadata.spreadsheetId,
    title: metadata.properties ? metadata.properties.title : undefined,
    locale: metadata.properties ? metadata.properties.locale : undefined,
    timeZone: metadata.properties ? metadata.properties.timeZone : undefined,
    sheets: metadata.sheets
      ? metadata.sheets.map((sheet: any) => ({
          sheetId: sheet.properties ? sheet.properties.sheetId : undefined,
          title: sheet.properties ? sheet.properties.title : undefined,
          index: sheet.properties ? sheet.properties.index : undefined,
          rowCount: sheet.properties?.gridProperties
            ? sheet.properties.gridProperties.rowCount
            : undefined,
          columnCount: sheet.properties?.gridProperties
            ? sheet.properties.gridProperties.columnCount
            : undefined,
          tabColor: sheet.properties ? sheet.properties.tabColor : undefined,
        }))
      : undefined,
  };

  return formatSuccessResponse(formattedData);
}

export function formatUpdateResponse(updatedCells: number, updatedRange?: string): ToolResponse {
  const message = updatedRange
    ? `Successfully updated ${updatedCells} cells in range: ${updatedRange}`
    : `Successfully updated ${updatedCells} cells`;

  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
}

export function formatAppendResponse(updates: any): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: `Successfully appended ${updates.updatedCells || 0} cells to range: ${updates.updatedRange}`,
      },
    ],
  };
}

export function formatClearResponse(clearedRange: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: `Successfully cleared range: ${clearedRange}`,
      },
    ],
  };
}

export function formatSpreadsheetCreatedResponse(spreadsheet: any): ToolResponse {
  return formatSuccessResponse(
    {
      spreadsheetId: spreadsheet.spreadsheetId,
      spreadsheetUrl: spreadsheet.spreadsheetUrl,
      title: spreadsheet.properties ? spreadsheet.properties.title : undefined,
    },
    'Spreadsheet created successfully'
  );
}

export function formatSheetOperationResponse(operation: string, details?: any): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: `${operation} completed successfully${details ? ': ' + JSON.stringify(details, null, 2) : ''}`,
      },
    ],
  };
}

export function formatToolResponse(message: string, data?: any): ToolResponse {
  if (data) {
    return formatSuccessResponse(data, message);
  }
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
}
