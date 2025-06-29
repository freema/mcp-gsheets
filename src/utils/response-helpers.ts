import { ToolResponse } from '../types/tools.js';

/**
 * Creates a standard text response
 */
export function createTextResponse(text: string): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Creates a JSON response with optional message
 */
export function createJsonResponse(data: any, message?: string): ToolResponse {
  const content = message
    ? `${message}\n\n${JSON.stringify(data, null, 2)}`
    : JSON.stringify(data, null, 2);

  return createTextResponse(content);
}

/**
 * Creates a success message response
 */
export function createSuccessResponse(message: string): ToolResponse {
  return createTextResponse(message);
}

/**
 * Creates an empty data response
 */
export function createEmptyResponse(context: string): ToolResponse {
  return createTextResponse(`No data found${context ? ` in ${context}` : ''}`);
}

/**
 * Creates a batch response with summary
 */
export function createBatchResponse(
  itemCount: number,
  itemType: string,
  details?: any
): ToolResponse {
  const summary = `Total ${itemType}: ${itemCount}`;

  if (details) {
    return createJsonResponse(details, summary);
  }

  return createTextResponse(summary);
}

/**
 * Creates an operation result response
 */
export function createOperationResponse(
  operation: string,
  affectedCount: number,
  itemType: string,
  details?: string
): ToolResponse {
  const message = `Successfully ${operation} ${affectedCount} ${itemType}${details ? `: ${details}` : ''}`;
  return createTextResponse(message);
}

/**
 * Helper to format range information
 */
export function formatRangeInfo(range: string, rowCount?: number, columnCount?: number): string {
  const parts = [`range: ${range}`];

  if (rowCount !== undefined) {
    parts.push(`rows: ${rowCount}`);
  }

  if (columnCount !== undefined) {
    parts.push(`columns: ${columnCount}`);
  }

  return parts.join(', ');
}

/**
 * Helper to format sheet information
 */
export function formatSheetInfo(sheet: {
  sheetId?: number;
  title?: string;
  index?: number;
}): string {
  const parts = [];

  if (sheet.title) {
    parts.push(`"${sheet.title}"`);
  }

  if (sheet.sheetId !== undefined) {
    parts.push(`ID: ${sheet.sheetId}`);
  }

  if (sheet.index !== undefined) {
    parts.push(`index: ${sheet.index}`);
  }

  return parts.join(' ');
}

/**
 * Creates a standard error response
 */
export function createErrorResponse(error: any): ToolResponse {
  const errorMessage = error.message || 'An unknown error occurred';
  return createTextResponse(`Error: ${errorMessage}`);
}
