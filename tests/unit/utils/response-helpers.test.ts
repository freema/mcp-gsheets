import { describe, it, expect } from 'vitest';
import {
  createTextResponse,
  createJsonResponse,
  createSuccessResponse,
  createEmptyResponse,
  createBatchResponse,
  createOperationResponse,
  formatRangeInfo,
  formatSheetInfo,
  createErrorResponse,
} from '../../../src/utils/response-helpers.js';

describe('createTextResponse', () => {
  it('should return a text response with the given text', () => {
    const result = createTextResponse('Hello, world!');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Hello, world!' }],
    });
  });
});

describe('createJsonResponse', () => {
  it('should return JSON response without message', () => {
    const data = { key: 'value' };
    const result = createJsonResponse(data);
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('should return JSON response with message prefix', () => {
    const data = { key: 'value' };
    const result = createJsonResponse(data, 'Success');
    expect(result.content[0].text).toBe(`Success\n\n${JSON.stringify(data, null, 2)}`);
  });
});

describe('createSuccessResponse', () => {
  it('should return a text response with the success message', () => {
    const result = createSuccessResponse('Operation completed');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Operation completed' }],
    });
  });
});

describe('createEmptyResponse', () => {
  it('should include context when context is provided', () => {
    const result = createEmptyResponse('range: A1:B10');
    expect(result.content[0].text).toBe('No data found in range: A1:B10');
  });

  it('should omit context when context is empty string', () => {
    const result = createEmptyResponse('');
    expect(result.content[0].text).toBe('No data found');
  });
});

describe('createBatchResponse', () => {
  it('should return text summary without details', () => {
    const result = createBatchResponse(5, 'rows');
    expect(result.content[0].text).toBe('Total rows: 5');
  });

  it('should return JSON response when details are provided', () => {
    const details = { items: [1, 2, 3] };
    const result = createBatchResponse(3, 'items', details);
    expect(result.content[0].text).toContain('Total items: 3');
    expect(result.content[0].text).toContain(JSON.stringify(details, null, 2));
  });
});

describe('createOperationResponse', () => {
  it('should return message without details', () => {
    const result = createOperationResponse('deleted', 3, 'sheets');
    expect(result.content[0].text).toBe('Successfully deleted 3 sheets');
  });

  it('should return message with details appended', () => {
    const result = createOperationResponse('updated', 5, 'cells', 'range A1:B5');
    expect(result.content[0].text).toBe('Successfully updated 5 cells: range A1:B5');
  });
});

describe('formatRangeInfo', () => {
  it('should include only range when no row/column counts provided', () => {
    const result = formatRangeInfo('A1:B10');
    expect(result).toBe('range: A1:B10');
  });

  it('should include row count when provided', () => {
    const result = formatRangeInfo('A1:B10', 10);
    expect(result).toBe('range: A1:B10, rows: 10');
  });

  it('should include column count when provided', () => {
    const result = formatRangeInfo('A1:B10', undefined, 2);
    expect(result).toBe('range: A1:B10, columns: 2');
  });

  it('should include both row and column counts when provided', () => {
    const result = formatRangeInfo('A1:B10', 10, 2);
    expect(result).toBe('range: A1:B10, rows: 10, columns: 2');
  });
});

describe('formatSheetInfo', () => {
  it('should return empty string for empty sheet object', () => {
    const result = formatSheetInfo({});
    expect(result).toBe('');
  });

  it('should include title when provided', () => {
    const result = formatSheetInfo({ title: 'My Sheet' });
    expect(result).toBe('"My Sheet"');
  });

  it('should include sheetId when provided', () => {
    const result = formatSheetInfo({ sheetId: 123 });
    expect(result).toBe('ID: 123');
  });

  it('should include index when provided', () => {
    const result = formatSheetInfo({ index: 2 });
    expect(result).toBe('index: 2');
  });

  it('should include all fields when all provided', () => {
    const result = formatSheetInfo({ title: 'My Sheet', sheetId: 123, index: 2 });
    expect(result).toBe('"My Sheet" ID: 123 index: 2');
  });
});

describe('createErrorResponse', () => {
  it('should include the error message', () => {
    const error = new Error('Something went wrong');
    const result = createErrorResponse(error);
    expect(result.content[0].text).toBe('Error: Something went wrong');
  });

  it('should use default message when error has no message', () => {
    const result = createErrorResponse({});
    expect(result.content[0].text).toBe('Error: An unknown error occurred');
  });
});
