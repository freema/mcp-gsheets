import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleError, isRetriableError, GoogleSheetsError } from '../../../src/utils/error-handler';

describe('handleError', () => {
  // Mock console.error to prevent test output pollution
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('HTTP error codes', () => {
    it('should handle 401 authentication error', () => {
      const error = { code: 401 };
      const result = handleError(error);
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error: Authentication failed');
      expect(result.content[0].text).toContain('Please check that your service account credentials are valid');
    });

    it('should handle 403 permission denied error', () => {
      const error = { code: 403 };
      const result = handleError(error);
      
      expect(result.content[0].text).toContain('Error: Permission denied');
      expect(result.content[0].text).toContain('Please ensure the service account has access');
      expect(result.content[0].text).toContain('Share the spreadsheet with the service account email');
    });

    it('should handle 404 not found error', () => {
      const error = { code: 404 };
      const result = handleError(error);
      
      expect(result.content[0].text).toContain('Error: Spreadsheet or range not found');
      expect(result.content[0].text).toContain('Please check that the spreadsheet ID and range are correct');
      expect(result.content[0].text).toContain('https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit');
    });

    it('should handle 429 rate limit error', () => {
      const error = { code: 429 };
      const result = handleError(error);
      
      expect(result.content[0].text).toContain('Error: Rate limit exceeded');
      expect(result.content[0].text).toContain('Too many requests. Please wait a moment and try again');
    });

    it('should handle 400 bad request error with message', () => {
      const error = { code: 400, message: 'Invalid range format' };
      const result = handleError(error);
      
      expect(result.content[0].text).toContain('Error: Invalid request');
      expect(result.content[0].text).toContain('Invalid range format');
    });

    it('should handle 400 bad request error without message', () => {
      const error = { code: 400 };
      const result = handleError(error);
      
      expect(result.content[0].text).toContain('Error: Invalid request');
      expect(result.content[0].text).toContain('Please check your input parameters');
    });
  });

  describe('error messages', () => {
    it('should use error message when no code is present', () => {
      const error = { message: 'Custom error message' };
      const result = handleError(error);
      
      expect(result.content[0].text).toBe('Error: Custom error message');
    });

    it('should handle error with both code and message', () => {
      const error = { code: 500, message: 'Internal server error occurred' };
      const result = handleError(error);
      
      expect(result.content[0].text).toBe('Error: Internal server error occurred');
    });

    it('should handle unexpected error without code or message', () => {
      const error = {};
      const result = handleError(error);
      
      expect(result.content[0].text).toBe('Error: An unexpected error occurred');
    });

    it('should handle null error', () => {
      const result = handleError(null);
      
      expect(result.content[0].text).toBe('Error: An unknown error occurred');
    });

    it('should handle undefined error', () => {
      const result = handleError(undefined);
      
      expect(result.content[0].text).toBe('Error: An unknown error occurred');
    });

    it('should handle string error', () => {
      const result = handleError('Simple error string');
      
      expect(result.content[0].text).toBe('Error: An unexpected error occurred');
    });

    it('should handle Error instance', () => {
      const error = new Error('Standard JavaScript error');
      const result = handleError(error);
      
      expect(result.content[0].text).toBe('Error: Standard JavaScript error');
    });
  });

  describe('console logging', () => {
    it('should log error to console', () => {
      const error = { code: 403, message: 'Access denied' };
      handleError(error);
      
      expect(console.error).toHaveBeenCalledWith('Error in Google Sheets operation:', error);
    });

    it('should log all error types', () => {
      handleError(null);
      expect(console.error).toHaveBeenCalledWith('Error in Google Sheets operation:', null);
      
      handleError('string error');
      expect(console.error).toHaveBeenCalledWith('Error in Google Sheets operation:', 'string error');
      
      const complexError = { code: 500, details: { nested: 'value' } };
      handleError(complexError);
      expect(console.error).toHaveBeenCalledWith('Error in Google Sheets operation:', complexError);
    });
  });

  describe('response format', () => {
    it('should always return proper ToolResponse format', () => {
      const errors = [
        { code: 401 },
        { message: 'Test' },
        {},
        null,
        undefined,
        new Error('Test'),
      ];

      errors.forEach((error) => {
        const result = handleError(error);
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
        expect(typeof result.content[0].text).toBe('string');
        expect(result.content[0].text).toMatch(/^Error: /);
      });
    });
  });
});

describe('isRetriableError', () => {
  it('should identify retriable error codes', () => {
    const retriableCodes = [429, 500, 502, 503, 504];
    
    retriableCodes.forEach((code) => {
      expect(isRetriableError({ code })).toBe(true);
    });
  });

  it('should identify non-retriable error codes', () => {
    const nonRetriableCodes = [400, 401, 403, 404, 405, 409];
    
    nonRetriableCodes.forEach((code) => {
      expect(isRetriableError({ code })).toBe(false);
    });
  });

  it('should handle errors without code', () => {
    expect(isRetriableError({})).toBe(false);
    expect(isRetriableError({ message: 'Error' })).toBe(false);
    expect(isRetriableError(null)).toBe(false);
    expect(isRetriableError(undefined)).toBe(false);
  });

  it('should handle non-numeric codes', () => {
    expect(isRetriableError({ code: '429' })).toBe(false);
    expect(isRetriableError({ code: null })).toBe(false);
    expect(isRetriableError({ code: undefined })).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isRetriableError({ code: 0 })).toBe(false);
    expect(isRetriableError({ code: -1 })).toBe(false);
    expect(isRetriableError({ code: 999 })).toBe(false);
  });
});

describe('GoogleSheetsError', () => {
  it('should create error with message only', () => {
    const error = new GoogleSheetsError('Test error message');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GoogleSheetsError);
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('GoogleSheetsError');
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  it('should create error with message and code', () => {
    const error = new GoogleSheetsError('Permission denied', 403);
    
    expect(error.message).toBe('Permission denied');
    expect(error.code).toBe(403);
    expect(error.details).toBeUndefined();
  });

  it('should create error with all parameters', () => {
    const details = { 
      spreadsheetId: '123',
      range: 'A1:B10',
      timestamp: new Date().toISOString(),
    };
    const error = new GoogleSheetsError('Complex error', 500, details);
    
    expect(error.message).toBe('Complex error');
    expect(error.code).toBe(500);
    expect(error.details).toEqual(details);
  });

  it('should have proper stack trace', () => {
    const error = new GoogleSheetsError('Stack trace test');
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('GoogleSheetsError: Stack trace test');
  });

  it('should handle empty message', () => {
    const error = new GoogleSheetsError('');
    
    expect(error.message).toBe('');
  });

  it('should handle various detail types', () => {
    const stringDetails = new GoogleSheetsError('Error', 400, 'String details');
    expect(stringDetails.details).toBe('String details');
    
    const arrayDetails = new GoogleSheetsError('Error', 400, ['item1', 'item2']);
    expect(arrayDetails.details).toEqual(['item1', 'item2']);
    
    const nullDetails = new GoogleSheetsError('Error', 400, null);
    expect(nullDetails.details).toBe(null);
  });

  it('should be catchable as Error', () => {
    const throwError = () => {
      throw new GoogleSheetsError('Test throw', 400);
    };

    expect(throwError).toThrow(Error);
    expect(throwError).toThrow(GoogleSheetsError);
    expect(throwError).toThrow('Test throw');
  });

});