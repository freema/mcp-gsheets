import { describe, it, expect } from 'vitest';
import { parseJsonInput } from '../../../src/utils/json-parser.js';

describe('parseJsonInput', () => {
  it('should return an object as-is when input is already an object', () => {
    const obj = { key: 'value', num: 42 };
    const result = parseJsonInput(obj, 'test');
    expect(result).toBe(obj);
  });

  it('should parse a valid JSON string and return the object', () => {
    const json = '{"key":"value","num":42}';
    const result = parseJsonInput(json, 'test');
    expect(result).toEqual({ key: 'value', num: 42 });
  });

  it('should throw an error with the property name for invalid JSON string', () => {
    expect(() => parseJsonInput('invalid json', 'myProp')).toThrow(
      'Invalid myProp: Expected object or valid JSON string'
    );
  });

  it('should throw an error for malformed JSON string', () => {
    expect(() => parseJsonInput('{broken:', 'position')).toThrow(
      'Invalid position: Expected object or valid JSON string'
    );
  });

  it('should parse a nested JSON object string', () => {
    const json = '{"outer":{"inner":"value"}}';
    const result = parseJsonInput(json, 'test');
    expect(result).toEqual({ outer: { inner: 'value' } });
  });

  it('should return an array as-is when input is already an array', () => {
    const arr = [1, 2, 3];
    const result = parseJsonInput(arr, 'test');
    expect(result).toBe(arr);
  });
});
