import { expect, vi } from 'vitest';

/**
 * Creates a mock function that returns different values on consecutive calls
 */
export function mockSequence<T>(...values: T[]) {
  let index = 0;
  return vi.fn(() => {
    const value = values[index % values.length];
    index++;
    return value;
  });
}

/**
 * Creates a mock async function that resolves with different values
 */
export function mockAsyncSequence<T>(...values: T[]) {
  let index = 0;
  return vi.fn(async () => {
    const value = values[index % values.length];
    index++;
    return value;
  });
}

/**
 * Creates a delay promise for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Asserts that a promise rejects with a specific error message
 */
export async function expectRejection(
  promise: Promise<any>,
  errorMessage: string | RegExp
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error) {
    if (error instanceof Error) {
      if (typeof errorMessage === 'string') {
        expect(error.message).toBe(errorMessage);
      } else {
        expect(error.message).toMatch(errorMessage);
      }
    } else {
      throw error;
    }
  }
}

/**
 * Creates a mock Google Sheets API error
 */
export function createGoogleApiError(code: number, message: string, errors?: any[]) {
  return {
    code,
    message,
    errors: errors || [{ message, domain: 'global', reason: 'invalid' }],
    response: {
      status: code,
      data: {
        error: {
          code,
          message,
          errors: errors || [{ message, domain: 'global', reason: 'invalid' }],
        },
      },
    },
  };
}

/**
 * Helper to create test spreadsheet metadata
 */
export function createTestSpreadsheet(overrides: any = {}) {
  return {
    spreadsheetId: 'test-spreadsheet-id',
    properties: {
      title: 'Test Spreadsheet',
      locale: 'en_US',
      timeZone: 'America/New_York',
      ...overrides.properties,
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
        },
      },
      ...(overrides.sheets || []),
    ],
    ...overrides,
  };
}

/**
 * Helper to create test value range
 */
export function createTestValueRange(range: string, values: any[][]) {
  return {
    range,
    majorDimension: 'ROWS',
    values,
  };
}