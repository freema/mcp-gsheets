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