import { describe, it, expect, vi } from 'vitest';

// Break the circular dependency between validation-helpers.ts and validators.ts
vi.mock('../../../src/utils/validators.js', () => ({
  validateSpreadsheetId: vi.fn((id: string) => !/[\s!]/.test(id)),
  validateRange: vi.fn((range: string) => !/\s/.test(range) && !range.includes('!!')),
}));

import {
  withCommonValidation,
  createRangeValidator,
  createSheetValidator,
  validateNumberInRange,
  validateColor,
  validateEnum,
  COMMON_DEFAULTS,
} from '../../../src/utils/validation-helpers.js';

const VALID_SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

describe('withCommonValidation', () => {
  describe('spreadsheetId field', () => {
    const validator = withCommonValidation((input: any) => input, {
      requiredFields: ['spreadsheetId'],
    });

    it('should pass for valid spreadsheet ID', () => {
      expect(() => validator({ spreadsheetId: VALID_SPREADSHEET_ID })).not.toThrow();
    });

    it('should throw for missing spreadsheet ID', () => {
      expect(() => validator({})).toThrow('spreadsheetId is required');
    });

    it('should throw for invalid spreadsheet ID format', () => {
      expect(() => validator({ spreadsheetId: 'invalid id!' })).toThrow(
        'Invalid spreadsheet ID format'
      );
    });
  });

  describe('range field', () => {
    const validator = withCommonValidation((input: any) => input, {
      requiredFields: ['range'],
    });

    it('should pass for valid range', () => {
      expect(() => validator({ range: 'Sheet1!A1:B10' })).not.toThrow();
    });

    it('should throw for missing range', () => {
      expect(() => validator({})).toThrow('range is required');
    });

    it('should throw for invalid range format', () => {
      expect(() => validator({ range: 'invalid range!!' })).toThrow();
    });
  });

  describe('sheetId field', () => {
    const validator = withCommonValidation((input: any) => input, {
      requiredFields: ['sheetId'],
    });

    it('should pass for valid sheetId', () => {
      expect(() => validator({ sheetId: 0 })).not.toThrow();
    });

    it('should throw for missing sheetId', () => {
      expect(() => validator({})).toThrow('sheetId is required');
    });

    it('should throw for non-number sheetId', () => {
      expect(() => validator({ sheetId: 'string' })).toThrow('sheetId is required');
    });
  });

  describe('values field', () => {
    const validator = withCommonValidation((input: any) => input, {
      requiredFields: ['values'],
    });

    it('should pass for valid values array', () => {
      expect(() => validator({ values: [['a', 'b']] })).not.toThrow();
    });

    it('should throw for missing values', () => {
      expect(() => validator({})).toThrow('values is required');
    });
  });

  describe('title field', () => {
    const validator = withCommonValidation((input: any) => input, {
      requiredFields: ['title'],
    });

    it('should pass for valid title', () => {
      expect(() => validator({ title: 'My Title' })).not.toThrow();
    });

    it('should throw for missing title', () => {
      expect(() => validator({})).toThrow('title is required');
    });
  });

  describe('ranges field', () => {
    const validator = withCommonValidation((input: any) => input, {
      requiredFields: ['ranges'],
    });

    it('should pass for valid ranges array', () => {
      expect(() => validator({ ranges: ['Sheet1!A1:B10', 'Sheet1!C1:D10'] })).not.toThrow();
    });

    it('should throw for missing ranges', () => {
      expect(() => validator({})).toThrow('ranges is required');
    });

    it('should throw for empty ranges array', () => {
      expect(() => validator({ ranges: [] })).toThrow('ranges is required');
    });

    it('should throw for invalid range in ranges', () => {
      expect(() => validator({ ranges: ['invalid range!!'] })).toThrow('Invalid range format');
    });
  });

  describe('data field', () => {
    const validator = withCommonValidation((input: any) => input, {
      requiredFields: ['data'],
    });

    it('should pass for valid data array', () => {
      expect(() =>
        validator({ data: [{ range: 'Sheet1!A1:B10', values: [['a']] }] })
      ).not.toThrow();
    });

    it('should throw for missing data', () => {
      expect(() => validator({})).toThrow('data is required');
    });

    it('should throw for empty data array', () => {
      expect(() => validator({ data: [] })).toThrow('data is required');
    });

    it('should throw for data item without range', () => {
      expect(() => validator({ data: [{ values: [['a']] }] })).toThrow(
        'Each data item must have range and values properties'
      );
    });

    it('should throw for data item with invalid range', () => {
      expect(() => validator({ data: [{ range: 'invalid!!', values: [['a']] }] })).toThrow(
        'Invalid range format'
      );
    });
  });

  describe('defaults', () => {
    it('should apply defaults to undefined fields', () => {
      const validator = withCommonValidation((input: any) => input, {
        defaults: { foo: 'bar', count: 1 },
      });
      const result = validator({ existing: 'value' });
      expect(result).toEqual({ existing: 'value', foo: 'bar', count: 1 });
    });

    it('should not override existing field values with defaults', () => {
      const validator = withCommonValidation((input: any) => input, {
        defaults: { foo: 'default' },
      });
      const result = validator({ foo: 'custom' });
      expect(result.foo).toBe('custom');
    });
  });
});

describe('createRangeValidator', () => {
  it('should create a validator for spreadsheetId and range', () => {
    const validator = createRangeValidator();
    expect(() =>
      validator({ spreadsheetId: VALID_SPREADSHEET_ID, range: 'Sheet1!A1:B10' })
    ).not.toThrow();
  });

  it('should run additional validation when provided', () => {
    const validator = createRangeValidator((input: any) => {
      if (!input.extraField) throw new Error('extraField is required');
    });
    expect(() =>
      validator({ spreadsheetId: VALID_SPREADSHEET_ID, range: 'A1:B10', extraField: 'value' })
    ).not.toThrow();
    expect(() =>
      validator({ spreadsheetId: VALID_SPREADSHEET_ID, range: 'A1:B10' })
    ).toThrow('extraField is required');
  });

  it('should apply defaults when provided', () => {
    const validator = createRangeValidator(undefined, { valueInputOption: 'USER_ENTERED' });
    const result = validator({ spreadsheetId: VALID_SPREADSHEET_ID, range: 'A1:B10' });
    expect((result as any).valueInputOption).toBe('USER_ENTERED');
  });
});

describe('createSheetValidator', () => {
  it('should create a validator for spreadsheetId and sheetId', () => {
    const validator = createSheetValidator();
    expect(() =>
      validator({ spreadsheetId: VALID_SPREADSHEET_ID, sheetId: 0 })
    ).not.toThrow();
  });

  it('should run additional validation when provided', () => {
    const validator = createSheetValidator((input: any) => {
      if (!input.extra) throw new Error('extra is required');
    });
    expect(() =>
      validator({ spreadsheetId: VALID_SPREADSHEET_ID, sheetId: 0, extra: 'value' })
    ).not.toThrow();
    expect(() =>
      validator({ spreadsheetId: VALID_SPREADSHEET_ID, sheetId: 0 })
    ).toThrow('extra is required');
  });

  it('should apply defaults when provided', () => {
    const validator = createSheetValidator(undefined, { title: 'Default' });
    const result = validator({ spreadsheetId: VALID_SPREADSHEET_ID, sheetId: 0 });
    expect((result as any).title).toBe('Default');
  });
});

describe('validateNumberInRange', () => {
  it('should not throw when value is within range', () => {
    expect(() => validateNumberInRange(0.5, 'alpha', 0, 1)).not.toThrow();
  });

  it('should not throw when value is undefined', () => {
    expect(() => validateNumberInRange(undefined, 'alpha', 0, 1)).not.toThrow();
  });

  it('should throw when value is below minimum', () => {
    expect(() => validateNumberInRange(-0.1, 'alpha', 0, 1)).toThrow(
      'alpha must be between 0 and 1'
    );
  });

  it('should throw when value is above maximum', () => {
    expect(() => validateNumberInRange(1.1, 'alpha', 0, 1)).toThrow(
      'alpha must be between 0 and 1'
    );
  });

  it('should throw when value is not a number', () => {
    expect(() => validateNumberInRange('string' as any, 'alpha', 0, 1)).toThrow(
      'alpha must be between 0 and 1'
    );
  });

  it('should accept boundary values', () => {
    expect(() => validateNumberInRange(0, 'alpha', 0, 1)).not.toThrow();
    expect(() => validateNumberInRange(1, 'alpha', 0, 1)).not.toThrow();
  });
});

describe('validateColor', () => {
  it('should not throw for undefined color', () => {
    expect(() => validateColor(undefined, 'backgroundColor')).not.toThrow();
  });

  it('should not throw for valid color object', () => {
    expect(() =>
      validateColor({ red: 0.5, green: 0.3, blue: 1, alpha: 0.8 }, 'backgroundColor')
    ).not.toThrow();
  });

  it('should throw when color is not an object', () => {
    expect(() => validateColor('red', 'backgroundColor')).toThrow(
      'backgroundColor must be an object'
    );
  });

  it('should throw when a color component is out of range', () => {
    expect(() =>
      validateColor({ red: 1.5 }, 'backgroundColor')
    ).toThrow('backgroundColor.red must be between 0 and 1');
  });

  it('should ignore undefined color components', () => {
    expect(() => validateColor({ red: 0.5 }, 'color')).not.toThrow();
  });
});

describe('validateEnum', () => {
  const validValues = ['ROWS', 'COLUMNS'] as const;

  it('should not throw when value is undefined', () => {
    expect(() => validateEnum(undefined, 'dimension', validValues, 'Invalid dimension')).not.toThrow();
  });

  it('should not throw for valid enum value', () => {
    expect(() => validateEnum('ROWS', 'dimension', validValues, 'Invalid dimension')).not.toThrow();
  });

  it('should throw for invalid enum value', () => {
    expect(() =>
      validateEnum('DIAGONAL', 'dimension', validValues, 'Invalid dimension')
    ).toThrow('Invalid dimension');
  });
});

describe('COMMON_DEFAULTS', () => {
  it('should export correct default values', () => {
    expect(COMMON_DEFAULTS.majorDimension).toBe('ROWS');
    expect(COMMON_DEFAULTS.valueInputOption).toBe('USER_ENTERED');
    expect(COMMON_DEFAULTS.insertDataOption).toBe('OVERWRITE');
  });
});
