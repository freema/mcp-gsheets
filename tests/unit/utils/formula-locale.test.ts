import { describe, it, expect } from 'vitest';
import {
  normalizeFormulaLocale,
  normalizeConditionalFormatFormulas,
} from '../../../src/utils/formula-locale.js';

describe('normalizeFormulaLocale', () => {
  it('replaces argument separators ; with , outside strings', () => {
    const result = normalizeFormulaLocale('=IF(A1>0;"a;b";"no")');
    expect(result.normalized).toBe('=IF(A1>0,"a;b","no")');
    expect(result.localeDetected).toBe('semicolon');
  });

  it('handles escaped quotes inside strings', () => {
    const result = normalizeFormulaLocale('=IF(A1>0;"He said ""a;b""";"no")');
    expect(result.normalized).toBe('=IF(A1>0,"He said ""a;b""","no")');
    expect(result.localeDetected).toBe('semicolon');
  });

  it('keeps formulas without separators unchanged and detects comma locale', () => {
    const result = normalizeFormulaLocale('=NOW()');
    expect(result.normalized).toBe('=NOW()');
    expect(result.localeDetected).toBe('comma');
  });

  it('returns unknown for non-formula input', () => {
    const result = normalizeFormulaLocale('plain-text');
    expect(result).toEqual({
      normalized: 'plain-text',
      raw: 'plain-text',
      localeDetected: 'unknown',
    });
  });
});

describe('normalizeConditionalFormatFormulas', () => {
  it('normalizes booleanRule formulas and stores raw formulas', () => {
    const rule = {
      booleanRule: {
        condition: {
          values: [{ userEnteredValue: '=IF(A1>0;"x";"y")' }, { userEnteredValue: 'TEXT' }],
        },
      },
    };

    const normalized = normalizeConditionalFormatFormulas(rule);
    expect(normalized.booleanRule.condition.values[0].userEnteredValue).toBe('=IF(A1>0,"x","y")');
    expect(normalized._formulaLocaleRaw).toEqual(['=IF(A1>0;"x";"y")']);
  });

  it('normalizes gradientRule thresholds', () => {
    const rule = {
      gradientRule: {
        minpoint: { value: '=A1;A2' },
        midpoint: { value: '50' },
        maxpoint: { value: '=B1;B2' },
      },
    };

    const normalized = normalizeConditionalFormatFormulas(rule);
    expect(normalized.gradientRule.minpoint.value).toBe('=A1,A2');
    expect(normalized.gradientRule.maxpoint.value).toBe('=B1,B2');
    expect(normalized._formulaLocaleRaw).toEqual(['=A1;A2', '=B1;B2']);
  });
});
