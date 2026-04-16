import { describe, it, expect } from 'vitest';
import { ERROR_MESSAGES } from '../../../src/utils/error-messages.js';

describe('ERROR_MESSAGES', () => {
  describe('factory functions', () => {
    it('REQUIRED_STRING should return correct message', () => {
      expect(ERROR_MESSAGES.REQUIRED_STRING('name')).toBe(
        'name is required and must be a string'
      );
    });

    it('REQUIRED_NUMBER should return correct message', () => {
      expect(ERROR_MESSAGES.REQUIRED_NUMBER('count')).toBe(
        'count is required and must be a number'
      );
    });

    it('REQUIRED_ARRAY should return correct message', () => {
      expect(ERROR_MESSAGES.REQUIRED_ARRAY('items')).toBe(
        'items is required and must be a non-empty array'
      );
    });

    it('REQUIRED_OBJECT should return correct message', () => {
      expect(ERROR_MESSAGES.REQUIRED_OBJECT('config')).toBe(
        'config is required and must be an object'
      );
    });

    it('REQUIRED_POSITIVE should return correct message', () => {
      expect(ERROR_MESSAGES.REQUIRED_POSITIVE('rows')).toBe('rows must be a positive number');
    });

    it('REQUIRED_NON_NEGATIVE should return correct message', () => {
      expect(ERROR_MESSAGES.REQUIRED_NON_NEGATIVE('index')).toBe(
        'index must be a non-negative number'
      );
    });

    it('INVALID_COLOR_VALUE should return correct message', () => {
      expect(ERROR_MESSAGES.INVALID_COLOR_VALUE('red')).toBe(
        'red color value must be between 0 and 1'
      );
    });
  });

  describe('string constants', () => {
    it('INVALID_RANGE should be defined', () => {
      expect(ERROR_MESSAGES.INVALID_RANGE).toBe(
        'Invalid range format. Use A1 notation (e.g., "Sheet1!A1:B10")'
      );
    });

    it('SPREADSHEET_ID_REQUIRED should be defined', () => {
      expect(ERROR_MESSAGES.SPREADSHEET_ID_REQUIRED).toBe(
        'spreadsheetId is required and must be a string'
      );
    });
  });
});
