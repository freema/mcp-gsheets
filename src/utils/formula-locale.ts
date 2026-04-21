/**
 * Normalizes a Google Sheets formula from any locale to the canonical English locale
 * (comma as function argument separator).
 *
 * Google Sheets returns formulas in the spreadsheet's locale:
 *   Polish: =IF(A1>0;"yes";"no")
 *   English: =IF(A1>0,"yes","no")
 *
 * This function replaces semicolons used as argument separators with commas,
 * while preserving semicolons inside quoted string literals.
 *
 * Returns { normalized, raw } where:
 *   - normalized: formula with commas as separators (canonical form)
 *   - raw: original formula unchanged
 *   - localeDetected: 'semicolon' | 'comma' | 'unknown'
 */
export function normalizeFormulaLocale(formula: string): {
  normalized: string;
  raw: string;
  localeDetected: 'semicolon' | 'comma' | 'unknown';
} {
  if (!formula?.startsWith('=')) {
    return { normalized: formula, raw: formula, localeDetected: 'unknown' };
  }

  let result = '';
  let inString = false;
  let hasSemicolonSeparator = false;

  for (let i = 0; i < formula.length; i++) {
    const char = formula[i];

    if (char === '"') {
      // Toggle string mode — handle escaped quotes ("")
      if (inString && formula[i + 1] === '"') {
        // Escaped quote inside string — keep both and skip
        result += '""';
        i++;
        continue;
      }
      inString = !inString;
      result += char;
    } else if (char === ';' && !inString) {
      hasSemicolonSeparator = true;
      result += ',';
    } else {
      result += char;
    }
  }

  const localeDetected = hasSemicolonSeparator ? 'semicolon' : 'comma';
  return { normalized: result, raw: formula, localeDetected };
}

/**
 * Normalizes all formula strings found in a conditional format rule.
 * Returns an augmented rule with normalized formulas and raw originals.
 */
export function normalizeConditionalFormatFormulas(rule: Record<string, any>): Record<string, any> {
  const result = { ...rule };

  // BooleanRule condition — may contain formula values
  if (result.booleanRule?.condition?.values) {
    const rawFormulas: string[] = [];
    result.booleanRule = {
      ...result.booleanRule,
      condition: {
        ...result.booleanRule.condition,
        values: result.booleanRule.condition.values.map((v: any) => {
          if (v.userEnteredValue?.startsWith?.('=')) {
            const { normalized, raw } = normalizeFormulaLocale(v.userEnteredValue);
            rawFormulas.push(raw);
            return { ...v, userEnteredValue: normalized };
          }
          return v;
        }),
      },
    };
    if (rawFormulas.length > 0) {
      result._formulaLocaleRaw = rawFormulas;
    }
  }

  // GradientRule — thresholds may contain formulas
  if (result.gradientRule) {
    const rawFormulas: string[] = [];
    const normalizeThreshold = (threshold: any) => {
      if (!threshold) {
        return threshold;
      }
      if (threshold.value?.startsWith?.('=')) {
        const { normalized, raw } = normalizeFormulaLocale(threshold.value);
        rawFormulas.push(raw);
        return { ...threshold, value: normalized };
      }
      return threshold;
    };
    result.gradientRule = {
      ...result.gradientRule,
      minpoint: normalizeThreshold(result.gradientRule.minpoint),
      midpoint: normalizeThreshold(result.gradientRule.midpoint),
      maxpoint: normalizeThreshold(result.gradientRule.maxpoint),
    };
    if (rawFormulas.length > 0) {
      result._formulaLocaleRaw = rawFormulas;
    }
  }

  return result;
}
