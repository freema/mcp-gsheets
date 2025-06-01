class GoogleSheetsError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'GoogleSheetsError';
    this.code = code;
    this.details = details;
  }
}

const error = new GoogleSheetsError('Serialization test', 403, { key: 'value' });
console.log('Error object:', error);
console.log('Serialized:', JSON.stringify(error));
console.log('Own properties:', Object.getOwnPropertyNames(error));
console.log('Own enumerable properties:', Object.keys(error));