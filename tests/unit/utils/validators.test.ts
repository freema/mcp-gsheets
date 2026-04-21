import { describe, it, expect } from 'vitest';
import {
  validateSpreadsheetId,
  validateRange,
  validateGetValuesInput,
  validateUpdateValuesInput,
  validateAppendValuesInput,
  validateClearValuesInput,
  validateBatchGetValuesInput,
  validateBatchUpdateValuesInput,
  validateCreateSpreadsheetInput,
  validateInsertSheetInput,
  validateDeleteSheetInput,
  validateDuplicateSheetInput,
  validateUpdateSheetPropertiesInput,
  validateCopyToInput,
  validateFormatCellsInput,
  validateUpdateBordersInput,
  validateMergeCellsInput,
  validateUnmergeCellsInput,
  validateAddConditionalFormattingInput,
  validateInsertRowsInput,
  validateBatchDeleteSheetsInput,
  validateBatchFormatCellsInput,
  validateCreateChartInput,
  validateUpdateChartInput,
  validateDeleteChartInput,
  validateDeleteColumnsInput,
  validateDeleteRowsInput,
} from '../../../src/utils/validators';
import { testSpreadsheetIds, testRanges, testValues, testInputs, testErrors } from '../../fixtures/test-data';

describe('validateSpreadsheetId', () => {
  it('should accept valid spreadsheet IDs', () => {
    testSpreadsheetIds.valid.forEach((id) => {
      expect(validateSpreadsheetId(id)).toBe(true);
    });
  });

  it('should reject invalid spreadsheet IDs', () => {
    testSpreadsheetIds.invalid.forEach((id) => {
      expect(validateSpreadsheetId(id)).toBe(false);
    });
  });

  it('should handle edge cases', () => {
    expect(validateSpreadsheetId('')).toBe(false);
    expect(validateSpreadsheetId(' ')).toBe(false);
    expect(validateSpreadsheetId('a'.repeat(100))).toBe(true); // long valid ID
  });
});

describe('validateRange', () => {
  describe('simple ranges', () => {
    it('should accept valid simple ranges', () => {
      testRanges.valid.simple.forEach((range) => {
        expect(validateRange(range)).toBe(true);
      });
    });

    it('should accept valid ranges with colon', () => {
      testRanges.valid.withRange.forEach((range) => {
        expect(validateRange(range)).toBe(true);
      });
    });
  });

  describe('ranges with sheet names', () => {
    it('should accept ranges with standard sheet names', () => {
      expect(validateRange('Sheet1!A1')).toBe(true);
      expect(validateRange('MySheet!A1:B10')).toBe(true);
    });


    it('should handle sheet names with special characters', () => {
      expect(validateRange("'Sheet with Spaces'!A1")).toBe(true);
      expect(validateRange("'Übungen & Aufgaben'!A1:Z99")).toBe(true);
      expect(validateRange("'2024-Budget (Final)'!A:A")).toBe(true);
      expect(validateRange("'Sheet #1'!1:100")).toBe(true);
      expect(validateRange("'Tom''s Data'!A1")).toBe(true); // escaped apostrophe
    });

    it('should handle edge cases with sheet names', () => {
      // Check fixture data to see what edge cases are expected to pass
      const validEdgeCases = [
        "'Sheet with Spaces'!A1",
        "'2024-Budget'!A1:Z99"
      ];
      validEdgeCases.forEach((range) => {
        expect(validateRange(range)).toBe(true);
      });
    });
  });

  describe('invalid ranges', () => {

    it('should reject ranges with multiple exclamation marks', () => {
      expect(validateRange('Sheet1!A1!B2')).toBe(false);
      expect(validateRange('Sheet1!!A1')).toBe(false);
    });

    it('should reject empty sheet names', () => {
      expect(validateRange('!A1')).toBe(false);
      expect(validateRange(' !A1')).toBe(false);
    });

    it('should reject invalid cell references', () => {
      expect(validateRange('Sheet1!ABC')).toBe(false); // no row number
      expect(validateRange('Sheet1!123')).toBe(false); // no column letter
      expect(validateRange('Sheet1!1A')).toBe(false); // wrong order
    });

    it('should reject range with sheet name but empty cell range', () => {
      // parts = ['Sheet1', ''] — cellRange is '' (falsy) → false
      expect(validateRange('Sheet1!')).toBe(false);
    });

    it('should reject empty string range', () => {
      // parts = [''] — else block, cellRange is '' (falsy) → false
      expect(validateRange('')).toBe(false);
    });
  });

  describe('case sensitivity', () => {
    it('should accept both uppercase and lowercase column letters', () => {
      expect(validateRange('a1')).toBe(true);
      expect(validateRange('A1')).toBe(true);
      expect(validateRange('aA1:Bb10')).toBe(true);
    });
  });
});

describe('validateGetValuesInput', () => {
  it('should validate correct input with all fields', () => {
    const result = validateGetValuesInput(testInputs.getValues.valid);
    expect(result).toEqual(testInputs.getValues.valid);
  });

  it('should validate minimal input and add defaults', () => {
    const result = validateGetValuesInput(testInputs.getValues.minimal);
    expect(result.spreadsheetId).toBe(testInputs.getValues.minimal.spreadsheetId);
    expect(result.range).toBe(testInputs.getValues.minimal.range);
    expect(result.majorDimension).toBe('ROWS');
    expect(result.valueRenderOption).toBe('FORMATTED_VALUE');
  });

  it('should throw error for missing required fields', () => {
    expect(() => validateGetValuesInput({})).toThrow('spreadsheetId is required');
    expect(() => validateGetValuesInput({ spreadsheetId: 'test' })).toThrow('range is required');
  });

  it('should throw error for invalid types', () => {
    expect(() => validateGetValuesInput({ spreadsheetId: 123, range: 'A1' }))
      .toThrow('spreadsheetId is required and must be a string');
    expect(() => validateGetValuesInput({ spreadsheetId: 'test', range: ['A1'] }))
      .toThrow('range is required and must be a string');
  });

  it('should throw error for invalid spreadsheet ID format', () => {
    expect(() => validateGetValuesInput({
      spreadsheetId: 'invalid id with spaces',
      range: 'A1',
    })).toThrow('Invalid spreadsheet ID format');
  });

  it('should throw error for invalid range format', () => {
    expect(() => validateGetValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'invalid range',
    })).toThrow('Invalid range format');
  });

  it('should handle null and undefined values', () => {
    expect(() => validateGetValuesInput(null)).toThrow();
    expect(() => validateGetValuesInput(undefined)).toThrow();
    expect(() => validateGetValuesInput({ spreadsheetId: null, range: 'A1' }))
      .toThrow('spreadsheetId is required');
    expect(() => validateGetValuesInput({ spreadsheetId: 'test', range: undefined }))
      .toThrow('range is required');
  });
});

describe('validateUpdateValuesInput', () => {
  it('should validate correct input with all fields', () => {
    const result = validateUpdateValuesInput(testInputs.updateValues.valid);
    expect(result).toEqual(testInputs.updateValues.valid);
  });

  it('should validate minimal input and add defaults', () => {
    const result = validateUpdateValuesInput(testInputs.updateValues.minimal);
    expect(result.valueInputOption).toBe('USER_ENTERED');
  });

  it('should throw error for missing values array', () => {
    expect(() => validateUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
    })).toThrow('values is required and must be an array');
  });

  it('should throw error for invalid values type', () => {
    expect(() => validateUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
      values: 'not an array',
    })).toThrow('values is required and must be an array');
  });

  it('should accept empty array for values', () => {
    const result = validateUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
      values: [],
    });
    expect(result.values).toEqual([]);
  });

  it('should accept complex nested arrays', () => {
    const result = validateUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1:C3',
      values: testValues.mixed,
    });
    expect(result.values).toEqual(testValues.mixed);
  });
});

describe('validateAppendValuesInput', () => {
  it('should validate correct input with all fields', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1',
      values: [['test']],
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
    };
    const result = validateAppendValuesInput(input);
    expect(result).toEqual(input);
  });

  it('should add default options', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
      values: [['test']],
    };
    const result = validateAppendValuesInput(input);
    expect(result.valueInputOption).toBe('USER_ENTERED');
    expect(result.insertDataOption).toBe('OVERWRITE');
  });
});

describe('validateClearValuesInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:B10',
    };
    const result = validateClearValuesInput(input);
    expect(result).toEqual(input);
  });

  it('should throw error for missing fields', () => {
    expect(() => validateClearValuesInput({})).toThrow('spreadsheetId is required');
    expect(() => validateClearValuesInput({ spreadsheetId: 'test' })).toThrow('range is required');
  });
});

describe('validateDeleteColumnsInput', () => {
  it('should accept full-column ranges', () => {
    const result = validateDeleteColumnsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!B:D',
    });

    expect(result).toEqual({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!B:D',
    });
  });

  it('should reject non-column ranges', () => {
    expect(() =>
      validateDeleteColumnsInput({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        range: 'Sheet1!B2:D4',
      })
    ).toThrow('Invalid column range format');
  });
});

describe('validateDeleteRowsInput', () => {
  it('should accept full-row ranges', () => {
    const result = validateDeleteRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!2:4',
    });

    expect(result).toEqual({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!2:4',
    });
  });

  it('should reject non-row ranges', () => {
    expect(() =>
      validateDeleteRowsInput({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        range: 'Sheet1!B2:D4',
      })
    ).toThrow('Invalid row range format');
  });
});

describe('validateBatchGetValuesInput', () => {
  it('should validate correct input with multiple ranges', () => {
    const result = validateBatchGetValuesInput(testInputs.batchGetValues.valid);
    expect(result).toEqual(testInputs.batchGetValues.valid);
  });

  it('should validate minimal input', () => {
    const result = validateBatchGetValuesInput(testInputs.batchGetValues.minimal);
    expect(result.ranges).toEqual(['A1']);
    expect(result.majorDimension).toBe('ROWS');
    expect(result.valueRenderOption).toBe('FORMATTED_VALUE');
  });

  it('should throw error for empty ranges array', () => {
    expect(() => validateBatchGetValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      ranges: [],
    })).toThrow('ranges is required and must be a non-empty array');
  });

  it('should throw error for invalid ranges', () => {
    expect(() => validateBatchGetValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      ranges: ['A1', 'invalid range'],
    })).toThrow('Invalid range format: invalid range');
  });

  it('should throw error for non-array ranges', () => {
    expect(() => validateBatchGetValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      ranges: 'A1,B2',
    })).toThrow('ranges is required and must be a non-empty array');
  });
});

describe('validateBatchUpdateValuesInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [
        { range: 'A1:B2', values: [['A1', 'B1'], ['A2', 'B2']] },
        { range: 'C1:D2', values: [['C1', 'D1'], ['C2', 'D2']] },
      ],
      valueInputOption: 'RAW',
    };
    const result = validateBatchUpdateValuesInput(input);
    expect(result).toEqual(input);
  });

  it('should add default valueInputOption', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [{ range: 'A1', values: [['test']] }],
    };
    const result = validateBatchUpdateValuesInput(input);
    expect(result.valueInputOption).toBe('USER_ENTERED');
  });

  it('should throw error for empty data array', () => {
    expect(() => validateBatchUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [],
    })).toThrow('data is required and must be a non-empty array');
  });

  it('should throw error for invalid data items', () => {
    expect(() => validateBatchUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [{ range: 'A1' }], // missing values
    })).toThrow('Each data item must have range and values properties');

    expect(() => validateBatchUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [{ values: [['test']] }], // missing range
    })).toThrow('Each data item must have range and values properties');
  });

  it('should throw error for invalid range format in data item', () => {
    expect(() => validateBatchUpdateValuesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      data: [{ range: 'invalid!!range', values: [[]] }],
    })).toThrow('Invalid range format');
  });
});

describe('validateCreateSpreadsheetInput', () => {
  it('should validate correct input with sheets', () => {
    const result = validateCreateSpreadsheetInput(testInputs.createSpreadsheet.valid);
    expect(result).toEqual(testInputs.createSpreadsheet.valid);
  });

  it('should validate minimal input', () => {
    const result = validateCreateSpreadsheetInput(testInputs.createSpreadsheet.minimal);
    expect(result.title).toBe('Simple Test');
    expect(result.sheets).toBeUndefined();
  });

  it('should throw error for missing title', () => {
    expect(() => validateCreateSpreadsheetInput({})).toThrow('title is required');
    expect(() => validateCreateSpreadsheetInput({ title: null })).toThrow('title is required');
    expect(() => validateCreateSpreadsheetInput({ title: 123 })).toThrow('title is required and must be a string');
  });

});

describe('validateInsertSheetInput', () => {
  it('should validate correct input with all fields', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      title: 'New Sheet',
      index: 1,
      rowCount: 500,
      columnCount: 50,
    };
    const result = validateInsertSheetInput(input);
    expect(result).toEqual(input);
  });

  it('should add default dimensions', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      title: 'New Sheet',
    };
    const result = validateInsertSheetInput(input);
    expect(result.rowCount).toBe(1000);
    expect(result.columnCount).toBe(26);
  });

  it('should throw error for missing required fields', () => {
    expect(() => validateInsertSheetInput({})).toThrow('spreadsheetId is required');
    expect(() => validateInsertSheetInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    })).toThrow('title is required');
  });
});

describe('validateDeleteSheetInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 123,
    };
    const result = validateDeleteSheetInput(input);
    expect(result).toEqual(input);
  });

  it('should accept sheetId of 0', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 0,
    };
    const result = validateDeleteSheetInput(input);
    expect(result.sheetId).toBe(0);
  });

  it('should throw error for missing sheetId', () => {
    expect(() => validateDeleteSheetInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    })).toThrow('sheetId is required');
  });

  it('should throw error for invalid sheetId type', () => {
    expect(() => validateDeleteSheetInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: '123',
    })).toThrow('sheetId is required and must be a number');
  });
});

describe('validateDuplicateSheetInput', () => {
  it('should validate correct input with all fields', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 123,
      insertSheetIndex: 2,
      newSheetName: 'Copy of Sheet',
    };
    const result = validateDuplicateSheetInput(input);
    expect(result).toEqual(input);
  });

  it('should validate minimal input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 0,
    };
    const result = validateDuplicateSheetInput(input);
    expect(result).toEqual(input);
  });
});

describe('validateUpdateSheetPropertiesInput', () => {
  it('should validate correct input with all properties', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 123,
      title: 'Updated Title',
      gridProperties: { rowCount: 2000, columnCount: 50 },
      tabColor: { red: 1.0, green: 0.5, blue: 0.0 },
    };
    const result = validateUpdateSheetPropertiesInput(input);
    expect(result).toEqual(input);
  });

  it('should validate minimal input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 0,
    };
    const result = validateUpdateSheetPropertiesInput(input);
    expect(result).toEqual(input);
  });

  it('should throw for missing sheetId', () => {
    expect(() => validateUpdateSheetPropertiesInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    })).toThrow('sheetId is required');
  });
});

describe('validateCopyToInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 123,
      destinationSpreadsheetId: '1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
    };
    const result = validateCopyToInput(input);
    expect(result).toEqual(input);
  });

  it('should throw error for missing destinationSpreadsheetId', () => {
    expect(() => validateCopyToInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 123,
    })).toThrow('destinationSpreadsheetId is required');
  });

  it('should throw error for invalid destination spreadsheet ID', () => {
    expect(() => validateCopyToInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetId: 123,
      destinationSpreadsheetId: 'invalid id!',
    })).toThrow('Invalid destination spreadsheet ID format');
  });
});

describe('validateFormatCellsInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:B10',
      format: {
        backgroundColor: { red: 1.0, green: 0.9, blue: 0.9 },
        textFormat: { bold: true, fontSize: 12 },
      },
    };
    const result = validateFormatCellsInput(input);
    expect(result).toEqual(input);
  });

  it('should throw error for missing format', () => {
    expect(() => validateFormatCellsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
    })).toThrow('format is required');
  });

  it('should throw error for invalid format type', () => {
    expect(() => validateFormatCellsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
      format: 'invalid',
    })).toThrow('format is required and must be an object');
  });

  it('should accept empty format object', () => {
    const result = validateFormatCellsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
      format: {},
    });
    expect(result.format).toEqual({});
  });
});

describe('validateUpdateBordersInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:B10',
      borders: {
        top: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
        bottom: { style: 'SOLID', width: 1, color: { red: 0, green: 0, blue: 0 } },
      },
    };
    const result = validateUpdateBordersInput(input);
    expect(result).toEqual(input);
  });

  it('should throw error for missing borders', () => {
    expect(() => validateUpdateBordersInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1',
    })).toThrow('borders is required');
  });
});

describe('validateMergeCellsInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:B2',
      mergeType: 'MERGE_ALL',
    };
    const result = validateMergeCellsInput(input);
    expect(result).toEqual(input);
  });

  it('should accept all valid merge types', () => {
    const validTypes = ['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'];
    validTypes.forEach((mergeType) => {
      const result = validateMergeCellsInput({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        range: 'A1:B2',
        mergeType,
      });
      expect(result.mergeType).toBe(mergeType);
    });
  });

  it('should throw error for invalid merge type', () => {
    expect(() => validateMergeCellsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1:B2',
      mergeType: 'INVALID_TYPE',
    })).toThrow('Invalid mergeType. Must be one of: MERGE_ALL, MERGE_COLUMNS, MERGE_ROWS');
  });

  it('should throw error for missing mergeType', () => {
    expect(() => validateMergeCellsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'A1:B2',
    })).toThrow('mergeType is required');
  });

  it('should throw error for missing range', () => {
    expect(() => validateMergeCellsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      mergeType: 'MERGE_ALL',
    })).toThrow('range is required');
  });
});

describe('validateUnmergeCellsInput', () => {
  it('should validate correct input', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A1:B2',
    };
    const result = validateUnmergeCellsInput(input);
    expect(result).toEqual(input);
  });
});

describe('validateAddConditionalFormattingInput', () => {
  it('should validate correct input with boolean rule', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [
        {
          ranges: ['Sheet1!A1:A10'],
          booleanRule: {
            condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '100' }] },
            format: { backgroundColor: { red: 1, green: 0, blue: 0 } },
          },
        },
      ],
    };
    const result = validateAddConditionalFormattingInput(input);
    expect(result).toEqual(input);
  });

  it('should validate correct input with gradient rule', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [
        {
          ranges: ['Sheet1!B1:B10'],
          gradientRule: {
            minpoint: { color: { red: 1, green: 1, blue: 1 }, type: 'MIN' },
            maxpoint: { color: { red: 0, green: 1, blue: 0 }, type: 'MAX' },
          },
        },
      ],
    };
    const result = validateAddConditionalFormattingInput(input);
    expect(result).toEqual(input);
  });

  it('should validate multiple rules with multiple ranges', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [
        {
          ranges: ['Sheet1!A1:A10', 'Sheet1!C1:C10'],
          booleanRule: {
            condition: { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: 'test' }] },
            format: { textFormat: { bold: true } },
          },
        },
        {
          ranges: ['Sheet2!A:A'],
          gradientRule: {
            minpoint: { color: { red: 1, green: 0, blue: 0 }, type: 'NUMBER', value: '0' },
            maxpoint: { color: { red: 0, green: 1, blue: 0 }, type: 'NUMBER', value: '100' },
          },
        },
      ],
    };
    const result = validateAddConditionalFormattingInput(input);
    expect(result).toEqual(input);
  });

  it('should throw error for empty rules array', () => {
    expect(() => validateAddConditionalFormattingInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [],
    })).toThrow('rules is required and must be a non-empty array');
  });

  it('should throw error for rule without ranges', () => {
    expect(() => validateAddConditionalFormattingInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [{ booleanRule: {} }],
    })).toThrow('Each rule must have a non-empty ranges array');
  });

  it('should throw error for empty ranges in rule', () => {
    expect(() => validateAddConditionalFormattingInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [{ ranges: [], booleanRule: {} }],
    })).toThrow('Each rule must have a non-empty ranges array');
  });

  it('should throw error for invalid range in rule', () => {
    expect(() => validateAddConditionalFormattingInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [
        {
          ranges: ['Sheet1!A1', 'invalid range'],
          booleanRule: {},
        },
      ],
    })).toThrow('Invalid range format: invalid range');
  });

  it('should throw error for rule without booleanRule or gradientRule', () => {
    expect(() => validateAddConditionalFormattingInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      rules: [{ ranges: ['A1:A10'] }],
    })).toThrow('Each rule must have either booleanRule or gradientRule');
  });
});

describe('validateInsertRowsInput', () => {
  it('should accept valid input with minimal parameters', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
    };

    const result = validateInsertRowsInput(input);

    expect(result).toEqual({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      rows: 1,
      position: 'BEFORE',
      inheritFromBefore: false,
      values: undefined,
      valueInputOption: 'USER_ENTERED',
    });
  });

  it('should accept valid input with all parameters', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A10',
      rows: 3,
      position: 'AFTER',
      inheritFromBefore: true,
      values: [['a', 'b'], ['c', 'd']],
      valueInputOption: 'RAW',
    };

    const result = validateInsertRowsInput(input);

    expect(result).toEqual(input);
  });

  it('should reject invalid spreadsheet ID', () => {
    expect(() => validateInsertRowsInput({
      spreadsheetId: 'invalid id!',
      range: 'Sheet1!A5',
    })).toThrow('Invalid spreadsheet ID format');
  });

  it('should reject invalid range', () => {
    expect(() => validateInsertRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'invalid range',
    })).toThrow();
  });

  it('should reject invalid rows count', () => {
    expect(() => validateInsertRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      rows: 0,
    })).toThrow('Rows must be a positive number');

    expect(() => validateInsertRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      rows: -1,
    })).toThrow('Rows must be a positive number');

    expect(() => validateInsertRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      rows: 'not a number',
    })).toThrow('Rows must be a positive number');
  });

  it('should reject invalid position', () => {
    expect(() => validateInsertRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      position: 'INVALID',
    })).toThrow('Position must be either BEFORE or AFTER');
  });

  it('should reject invalid values format', () => {
    expect(() => validateInsertRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      values: 'not an array',
    })).toThrow('Values must be a 2D array');

    expect(() => validateInsertRowsInput({
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      values: ['not', '2D', 'array'],
    })).toThrow('Values must be a 2D array');
  });

  it('should apply default values correctly', () => {
    const input = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      range: 'Sheet1!A5',
      rows: 5,
    };

    const result = validateInsertRowsInput(input);

    expect(result.position).toBe('BEFORE');
    expect(result.inheritFromBefore).toBe(false);
    expect(result.valueInputOption).toBe('USER_ENTERED');
  });
});

const VALID_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

describe('validateBatchDeleteSheetsInput', () => {
  it('should accept valid input', () => {
    const result = validateBatchDeleteSheetsInput({
      spreadsheetId: VALID_ID,
      sheetIds: [0, 1, 2],
    });
    expect(result.sheetIds).toEqual([0, 1, 2]);
  });

  it('should throw when sheetIds is missing', () => {
    expect(() => validateBatchDeleteSheetsInput({ spreadsheetId: VALID_ID })).toThrow();
  });

  it('should throw when sheetIds is empty array', () => {
    expect(() => validateBatchDeleteSheetsInput({ spreadsheetId: VALID_ID, sheetIds: [] })).toThrow();
  });

  it('should throw when sheetIds contains non-number', () => {
    expect(() =>
      validateBatchDeleteSheetsInput({ spreadsheetId: VALID_ID, sheetIds: ['a'] })
    ).toThrow('Each sheetId must be a number');
  });
});

describe('validateBatchFormatCellsInput', () => {
  it('should accept valid input', () => {
    const result = validateBatchFormatCellsInput({
      spreadsheetId: VALID_ID,
      formatRequests: [{ range: 'Sheet1!A1', format: { bold: true } }],
    });
    expect(result.formatRequests).toHaveLength(1);
  });

  it('should throw when formatRequests is missing', () => {
    expect(() => validateBatchFormatCellsInput({ spreadsheetId: VALID_ID })).toThrow();
  });

  it('should throw when formatRequests is empty', () => {
    expect(() => validateBatchFormatCellsInput({ spreadsheetId: VALID_ID, formatRequests: [] })).toThrow();
  });

  it('should throw when a request is missing range', () => {
    expect(() =>
      validateBatchFormatCellsInput({
        spreadsheetId: VALID_ID,
        formatRequests: [{ format: {} }],
      })
    ).toThrow('Each format request must have a range property');
  });

  it('should throw when a request range is invalid', () => {
    expect(() =>
      validateBatchFormatCellsInput({
        spreadsheetId: VALID_ID,
        formatRequests: [{ range: 'invalid range', format: {} }],
      })
    ).toThrow('Invalid range format');
  });

  it('should throw when a request is missing format', () => {
    expect(() =>
      validateBatchFormatCellsInput({
        spreadsheetId: VALID_ID,
        formatRequests: [{ range: 'Sheet1!A1' }],
      })
    ).toThrow('Each format request must have a format property');
  });
});

const VALID_POSITION = {
  overlayPosition: {
    anchorCell: { sheetId: 0, rowIndex: 0, columnIndex: 0 },
  },
};

const VALID_SERIES = [{ sourceRange: 'Sheet1!A1:A10' }];

describe('validateCreateChartInput', () => {
  it('should accept a valid minimal input', () => {
    const result = validateCreateChartInput({
      spreadsheetId: VALID_ID,
      position: VALID_POSITION,
      chartType: 'LINE',
      series: VALID_SERIES,
    });
    expect(result.chartType).toBe('LINE');
  });

  it('should throw when position is missing', () => {
    expect(() =>
      validateCreateChartInput({ spreadsheetId: VALID_ID, chartType: 'LINE', series: VALID_SERIES })
    ).toThrow();
  });

  it('should throw when chartType is missing', () => {
    expect(() =>
      validateCreateChartInput({ spreadsheetId: VALID_ID, position: VALID_POSITION, series: VALID_SERIES })
    ).toThrow();
  });

  it('should throw when chartType is invalid', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: VALID_POSITION,
        chartType: 'UNKNOWN',
        series: VALID_SERIES,
      })
    ).toThrow();
  });

  it('should throw when series is missing', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: VALID_POSITION,
        chartType: 'LINE',
      })
    ).toThrow();
  });

  it('should throw when series is empty', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: VALID_POSITION,
        chartType: 'LINE',
        series: [],
      })
    ).toThrow();
  });

  it('should throw when overlayPosition is missing', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: {},
        chartType: 'LINE',
        series: VALID_SERIES,
      })
    ).toThrow('position.overlayPosition is required');
  });

  it('should throw when anchorCell is missing', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: { overlayPosition: {} },
        chartType: 'LINE',
        series: VALID_SERIES,
      })
    ).toThrow('position.overlayPosition.anchorCell is required');
  });

  it('should throw when anchorCell.sheetId is missing', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: { overlayPosition: { anchorCell: { rowIndex: 0, columnIndex: 0 } } },
        chartType: 'LINE',
        series: VALID_SERIES,
      })
    ).toThrow('position.overlayPosition.anchorCell.sheetId');
  });

  it('should throw when anchorCell.rowIndex is missing', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: { overlayPosition: { anchorCell: { sheetId: 0, columnIndex: 0 } } },
        chartType: 'LINE',
        series: VALID_SERIES,
      })
    ).toThrow('position.overlayPosition.anchorCell.rowIndex');
  });

  it('should throw when anchorCell.columnIndex is missing', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: { overlayPosition: { anchorCell: { sheetId: 0, rowIndex: 0 } } },
        chartType: 'LINE',
        series: VALID_SERIES,
      })
    ).toThrow('position.overlayPosition.anchorCell.columnIndex');
  });

  it('should throw when series item is missing sourceRange', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: VALID_POSITION,
        chartType: 'LINE',
        series: [{}],
      })
    ).toThrow('Each series must have a sourceRange property');
  });

  it('should throw when series sourceRange is invalid', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: VALID_POSITION,
        chartType: 'LINE',
        series: [{ sourceRange: 'invalid range' }],
      })
    ).toThrow('Invalid series range format');
  });

  it('should throw when series targetAxis is invalid', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: VALID_POSITION,
        chartType: 'LINE',
        series: [{ sourceRange: 'Sheet1!A1:A10', targetAxis: 'INVALID' }],
      })
    ).toThrow();
  });

  it('should accept valid targetAxis LEFT_AXIS', () => {
    const result = validateCreateChartInput({
      spreadsheetId: VALID_ID,
      position: VALID_POSITION,
      chartType: 'LINE',
      series: [{ sourceRange: 'Sheet1!A1:A10', targetAxis: 'LEFT_AXIS' }],
    });
    expect(result.series[0].targetAxis).toBe('LEFT_AXIS');
  });

  it('should accept valid targetAxis RIGHT_AXIS', () => {
    const result = validateCreateChartInput({
      spreadsheetId: VALID_ID,
      position: VALID_POSITION,
      chartType: 'LINE',
      series: [{ sourceRange: 'Sheet1!A1:A10', targetAxis: 'RIGHT_AXIS' }],
    });
    expect(result.series[0].targetAxis).toBe('RIGHT_AXIS');
  });

  it('should throw when domainRange is invalid', () => {
    expect(() =>
      validateCreateChartInput({
        spreadsheetId: VALID_ID,
        position: VALID_POSITION,
        chartType: 'LINE',
        series: VALID_SERIES,
        domainRange: 'invalid',
      })
    ).toThrow('Invalid domain range format');
  });

  it('should accept valid domainRange', () => {
    const result = validateCreateChartInput({
      spreadsheetId: VALID_ID,
      position: VALID_POSITION,
      chartType: 'LINE',
      series: VALID_SERIES,
      domainRange: 'Sheet1!A1:A10',
    });
    expect(result.domainRange).toBe('Sheet1!A1:A10');
  });
});

describe('validateUpdateChartInput', () => {
  it('should accept valid minimal input', () => {
    const result = validateUpdateChartInput({
      spreadsheetId: VALID_ID,
      chartId: 123,
    });
    expect(result.chartId).toBe(123);
  });

  it('should throw when chartId is missing', () => {
    expect(() => validateUpdateChartInput({ spreadsheetId: VALID_ID })).toThrow();
  });

  it('should throw when chartId is not a number', () => {
    expect(() => validateUpdateChartInput({ spreadsheetId: VALID_ID, chartId: 'abc' })).toThrow();
  });

  it('should throw when chartType is invalid', () => {
    expect(() =>
      validateUpdateChartInput({ spreadsheetId: VALID_ID, chartId: 1, chartType: 'UNKNOWN' })
    ).toThrow();
  });

  it('should accept valid optional chartType', () => {
    const result = validateUpdateChartInput({
      spreadsheetId: VALID_ID,
      chartId: 1,
      chartType: 'BAR',
    });
    expect(result.chartType).toBe('BAR');
  });

  it('should throw when series is empty array', () => {
    expect(() =>
      validateUpdateChartInput({ spreadsheetId: VALID_ID, chartId: 1, series: [] })
    ).toThrow();
  });

  it('should throw when series item is missing sourceRange', () => {
    expect(() =>
      validateUpdateChartInput({ spreadsheetId: VALID_ID, chartId: 1, series: [{}] })
    ).toThrow('Each series must have a sourceRange property');
  });

  it('should throw when series sourceRange is invalid', () => {
    expect(() =>
      validateUpdateChartInput({
        spreadsheetId: VALID_ID,
        chartId: 1,
        series: [{ sourceRange: 'bad range' }],
      })
    ).toThrow('Invalid series range format');
  });

  it('should throw when series targetAxis is invalid', () => {
    expect(() =>
      validateUpdateChartInput({
        spreadsheetId: VALID_ID,
        chartId: 1,
        series: [{ sourceRange: 'Sheet1!A1:A10', targetAxis: 'INVALID' }],
      })
    ).toThrow();
  });

  it('should accept series with valid targetAxis', () => {
    // Covers the branch where targetAxis is truthy but IS in valid list → no throw
    const result = validateUpdateChartInput({
      spreadsheetId: VALID_ID,
      chartId: 1,
      series: [{ sourceRange: 'Sheet1!A1:A10', targetAxis: 'LEFT_AXIS' }],
    });
    expect(result.series).toBeDefined();
  });
});

describe('validateDeleteChartInput', () => {
  it('should accept valid input', () => {
    const result = validateDeleteChartInput({ spreadsheetId: VALID_ID, chartId: 42 });
    expect(result.chartId).toBe(42);
  });

  it('should throw when chartId is missing', () => {
    expect(() => validateDeleteChartInput({ spreadsheetId: VALID_ID })).toThrow();
  });

  it('should throw when chartId is not a number', () => {
    expect(() => validateDeleteChartInput({ spreadsheetId: VALID_ID, chartId: 'abc' })).toThrow();
  });
});
