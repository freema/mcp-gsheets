import { describe, it, expect } from 'vitest';
import {
  formatSuccessResponse,
  formatValuesResponse,
  formatBatchValuesResponse,
  formatSpreadsheetMetadata,
  formatUpdateResponse,
  formatAppendResponse,
  formatClearResponse,
  formatSpreadsheetCreatedResponse,
  formatSheetOperationResponse,
  formatToolResponse,
} from '../../../src/utils/formatters';
import { testValues } from '../../fixtures/test-data';

describe('formatSuccessResponse', () => {
  it('should format data without message', () => {
    const data = { key: 'value', number: 123 };
    const result = formatSuccessResponse(data);
    
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe(JSON.stringify(data, null, 2));
  });

  it('should format data with message', () => {
    const data = { key: 'value' };
    const message = 'Operation successful';
    const result = formatSuccessResponse(data, message);
    
    expect(result.content[0].text).toContain(message);
    expect(result.content[0].text).toContain(JSON.stringify(data, null, 2));
  });

  it('should handle null data', () => {
    const result = formatSuccessResponse(null);
    expect(result.content[0].text).toBe('null');
  });

  it('should handle undefined data', () => {
    const result = formatSuccessResponse(undefined);
    expect(result.content[0].text).toBe(JSON.stringify(undefined, null, 2));
  });

  it('should handle complex nested objects', () => {
    const complexData = {
      level1: {
        level2: {
          array: [1, 2, 3],
          object: { a: 'b' },
        },
      },
    };
    const result = formatSuccessResponse(complexData);
    expect(result.content[0].text).toContain('"level1"');
    expect(result.content[0].text).toContain('"level2"');
  });
});

describe('formatValuesResponse', () => {
  it('should format values with range', () => {
    const values = testValues.simple;
    const range = 'Sheet1!A1:C3';
    const result = formatValuesResponse(values, range);
    
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed.range).toBe(range);
    expect(parsed.rowCount).toBe(3);
    expect(parsed.columnCount).toBe(3);
    expect(parsed.values).toEqual(values);
  });

  it('should format values without range', () => {
    const values = [['A1', 'B1']];
    const result = formatValuesResponse(values);
    
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed.range).toBeUndefined();
    expect(parsed.rowCount).toBe(1);
    expect(parsed.columnCount).toBe(2);
  });

  it('should handle empty values array', () => {
    const result = formatValuesResponse([]);
    expect(result.content[0].text).toBe('No data found');
  });

  it('should handle empty values array with range', () => {
    const result = formatValuesResponse([], 'Sheet1!A1:B10');
    expect(result.content[0].text).toBe('No data found in range: Sheet1!A1:B10');
  });

  it('should handle null values', () => {
    const result = formatValuesResponse(null as any);
    expect(result.content[0].text).toBe('No data found');
  });

  it('should handle undefined values', () => {
    const result = formatValuesResponse(undefined as any);
    expect(result.content[0].text).toBe('No data found');
  });

  it('should handle jagged arrays', () => {
    const values = [
      ['A1', 'B1', 'C1'],
      ['A2', 'B2'], // shorter row
      ['A3'], // even shorter
    ];
    const result = formatValuesResponse(values);
    
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed.rowCount).toBe(3);
    expect(parsed.columnCount).toBe(3); // based on first row
  });

  it('should handle empty first row', () => {
    const values = [[], ['A2', 'B2']];
    const result = formatValuesResponse(values);
    
    const parsed = JSON.parse(result.content[0].text!);
    expect(parsed.columnCount).toBe(0);
  });
});

describe('formatBatchValuesResponse', () => {
  it('should format multiple value ranges', () => {
    const valueRanges = [
      {
        range: 'Sheet1!A1:B2',
        values: [['A1', 'B1'], ['A2', 'B2']],
      },
      {
        range: 'Sheet2!C1:D2',
        values: [['C1', 'D1'], ['C2', 'D2']],
      },
    ];
    
    const result = formatBatchValuesResponse(valueRanges);
    const parsed = JSON.parse(result.content[0].text!);
    
    expect(parsed.totalRanges).toBe(2);
    expect(parsed.valueRanges).toHaveLength(2);
    expect(parsed.valueRanges[0].range).toBe('Sheet1!A1:B2');
    expect(parsed.valueRanges[0].rowCount).toBe(2);
    expect(parsed.valueRanges[0].columnCount).toBe(2);
  });

  it('should handle value ranges without values', () => {
    const valueRanges = [
      {
        range: 'Sheet1!A1:B2',
        values: null,
      },
      {
        range: 'Sheet2!C1:D2',
        // no values property
      },
    ];
    
    const result = formatBatchValuesResponse(valueRanges);
    const parsed = JSON.parse(result.content[0].text!);
    
    expect(parsed.valueRanges[0].rowCount).toBe(0);
    expect(parsed.valueRanges[0].values).toEqual([]);
    expect(parsed.valueRanges[1].rowCount).toBe(0);
    expect(parsed.valueRanges[1].values).toEqual([]);
  });

  it('should handle empty valueRanges array', () => {
    const result = formatBatchValuesResponse([]);
    const parsed = JSON.parse(result.content[0].text!);
    
    expect(parsed.totalRanges).toBe(0);
    expect(parsed.valueRanges).toEqual([]);
  });
});

describe('formatSpreadsheetMetadata', () => {
  it('should format complete metadata', () => {
    const metadata = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      properties: {
        title: 'Test Spreadsheet',
        locale: 'en_US',
        timeZone: 'America/New_York',
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'Sheet1',
            index: 0,
            gridProperties: {
              rowCount: 1000,
              columnCount: 26,
            },
            tabColor: {
              red: 1.0,
              green: 0.5,
              blue: 0.0,
            },
          },
        },
      ],
    };
    
    const result = formatSpreadsheetMetadata(metadata);
    const parsed = JSON.parse(result.content[0].text!);
    
    expect(parsed.spreadsheetId).toBe(metadata.spreadsheetId);
    expect(parsed.title).toBe('Test Spreadsheet');
    expect(parsed.locale).toBe('en_US');
    expect(parsed.timeZone).toBe('America/New_York');
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0].sheetId).toBe(0);
    expect(parsed.sheets[0].rowCount).toBe(1000);
    expect(parsed.sheets[0].columnCount).toBe(26);
  });

  it('should handle metadata without properties', () => {
    const metadata = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    };
    
    const result = formatSpreadsheetMetadata(metadata);
    const parsed = JSON.parse(result.content[0].text!);
    
    expect(parsed.title).toBeUndefined();
    expect(parsed.locale).toBeUndefined();
    expect(parsed.sheets).toBeUndefined();
  });

  it('should handle sheets without properties', () => {
    const metadata = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheets: [
        {}, // no properties
        { properties: {} }, // empty properties
      ],
    };
    
    const result = formatSpreadsheetMetadata(metadata);
    const parsed = JSON.parse(result.content[0].text!);
    
    expect(parsed.sheets).toHaveLength(2);
    expect(parsed.sheets[0].sheetId).toBeUndefined();
    expect(parsed.sheets[1].sheetId).toBeUndefined();
  });

  it('should handle null/undefined values gracefully', () => {
    const metadata = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      properties: null,
      sheets: null,
    };
    
    const result = formatSpreadsheetMetadata(metadata);
    const parsed = JSON.parse(result.content[0].text!);
    
    expect(parsed.spreadsheetId).toBe(metadata.spreadsheetId);
    expect(parsed.title).toBeUndefined();
    expect(parsed.sheets).toBeUndefined();
  });
});

describe('formatUpdateResponse', () => {
  it('should format with range', () => {
    const result = formatUpdateResponse(9, 'Sheet1!A1:C3');
    expect(result.content[0].text).toBe('Successfully updated 9 cells in range: Sheet1!A1:C3');
  });

  it('should format without range', () => {
    const result = formatUpdateResponse(5);
    expect(result.content[0].text).toBe('Successfully updated 5 cells');
  });

  it('should handle zero cells', () => {
    const result = formatUpdateResponse(0);
    expect(result.content[0].text).toBe('Successfully updated 0 cells');
  });

  it('should handle large numbers', () => {
    const result = formatUpdateResponse(1000000);
    expect(result.content[0].text).toBe('Successfully updated 1000000 cells');
  });
});

describe('formatAppendResponse', () => {
  it('should format append response', () => {
    const updates = {
      updatedCells: 9,
      updatedRange: 'Sheet1!A11:C13',
    };
    const result = formatAppendResponse(updates);
    expect(result.content[0].text).toBe('Successfully appended 9 cells to range: Sheet1!A11:C13');
  });

  it('should handle missing updatedCells', () => {
    const updates = {
      updatedRange: 'Sheet1!A11:C13',
    };
    const result = formatAppendResponse(updates);
    expect(result.content[0].text).toBe('Successfully appended 0 cells to range: Sheet1!A11:C13');
  });

  it('should handle null updates object properties', () => {
    const updates = {
      updatedCells: null,
      updatedRange: 'Sheet1!A1',
    };
    const result = formatAppendResponse(updates);
    expect(result.content[0].text).toBe('Successfully appended 0 cells to range: Sheet1!A1');
  });
});

describe('formatClearResponse', () => {
  it('should format clear response', () => {
    const result = formatClearResponse('Sheet1!A1:C3');
    expect(result.content[0].text).toBe('Successfully cleared range: Sheet1!A1:C3');
  });

  it('should handle complex range', () => {
    const result = formatClearResponse("'My Sheet'!A:Z");
    expect(result.content[0].text).toBe("Successfully cleared range: 'My Sheet'!A:Z");
  });
});

describe('formatSpreadsheetCreatedResponse', () => {
  it('should format with all properties', () => {
    const spreadsheet = {
      spreadsheetId: 'new-id-123',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-id-123/edit',
      properties: {
        title: 'New Spreadsheet',
      },
    };
    
    const result = formatSpreadsheetCreatedResponse(spreadsheet);
    expect(result.content[0].text).toContain('Spreadsheet created successfully');
    
    const parsed = JSON.parse(result.content[0].text!.split('\n\n')[1]);
    expect(parsed.spreadsheetId).toBe('new-id-123');
    expect(parsed.spreadsheetUrl).toBe('https://docs.google.com/spreadsheets/d/new-id-123/edit');
    expect(parsed.title).toBe('New Spreadsheet');
  });

  it('should handle missing properties', () => {
    const spreadsheet = {
      spreadsheetId: 'new-id-123',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-id-123/edit',
    };
    
    const result = formatSpreadsheetCreatedResponse(spreadsheet);
    const parsed = JSON.parse(result.content[0].text!.split('\n\n')[1]);
    expect(parsed.title).toBeUndefined();
  });
});

describe('formatSheetOperationResponse', () => {
  it('should format operation without details', () => {
    const result = formatSheetOperationResponse('Sheet deleted');
    expect(result.content[0].text).toBe('Sheet deleted completed successfully');
  });

  it('should format operation with details', () => {
    const details = { sheetId: 123, title: 'Deleted Sheet' };
    const result = formatSheetOperationResponse('Sheet deleted', details);
    expect(result.content[0].text).toContain('Sheet deleted completed successfully');
    expect(result.content[0].text).toContain(JSON.stringify(details, null, 2));
  });

  it('should handle complex details object', () => {
    const details = {
      operation: 'duplicate',
      source: { sheetId: 1, title: 'Original' },
      destination: { sheetId: 2, title: 'Copy' },
      timestamp: new Date().toISOString(),
    };
    const result = formatSheetOperationResponse('Sheet duplicated', details);
    expect(result.content[0].text).toContain('Sheet duplicated completed successfully');
    expect(result.content[0].text).toContain('"operation": "duplicate"');
  });

  it('should handle null details', () => {
    const result = formatSheetOperationResponse('Operation completed', null);
    expect(result.content[0].text).toBe('Operation completed completed successfully');
  });
});

describe('formatToolResponse', () => {
  it('should format message only', () => {
    const result = formatToolResponse('Simple message');
    expect(result.content[0].text).toBe('Simple message');
  });

  it('should format message with data', () => {
    const data = { count: 10, status: 'complete' };
    const result = formatToolResponse('Operation finished', data);
    expect(result.content[0].text).toContain('Operation finished');
    expect(result.content[0].text).toContain(JSON.stringify(data, null, 2));
  });

  it('should handle empty message', () => {
    const result = formatToolResponse('');
    expect(result.content[0].text).toBe('');
  });


  it('should handle undefined data', () => {
    const result = formatToolResponse('Message', undefined);
    expect(result.content[0].text).toBe('Message');
  });
});