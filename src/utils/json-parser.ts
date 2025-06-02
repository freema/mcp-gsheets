/**
 * Helper function to parse JSON string input into an object
 * @param input - The input to parse
 * @param propertyName - The name of the property being parsed (for error messages)
 * @returns The parsed object
 * @throws Error if the input is not a valid JSON string
 */
export function parseJsonInput(input: any, propertyName: string): any {
  if (input && typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch (parseError) {
      throw new Error(`Invalid ${propertyName}: Expected object or valid JSON string`);
    }
  }
  return input;
}
