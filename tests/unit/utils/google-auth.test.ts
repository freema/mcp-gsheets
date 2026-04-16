import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// google-auth uses module-level singletons, so we need to reset modules between tests
// that test different auth paths

const VALID_SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  private_key: 'some-private-key',
  client_email: 'test@project.iam.gserviceaccount.com',
  project_id: 'my-project',
});

const VALID_PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----\n';
const VALID_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';

describe('validateAuth', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_CLIENT_EMAIL;
    delete process.env.GOOGLE_PROJECT_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw when no auth method is provided', async () => {
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('No authentication method provided');
  });

  it('should pass when GOOGLE_APPLICATION_CREDENTIALS is set', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
    process.env.GOOGLE_PROJECT_ID = 'my-project';
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).not.toThrow();
  });

  it('should pass when valid GOOGLE_SERVICE_ACCOUNT_KEY is set', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = VALID_SERVICE_ACCOUNT;
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).not.toThrow();
  });

  it('should throw when GOOGLE_SERVICE_ACCOUNT_KEY has invalid JSON', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'not-valid-json';
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('GOOGLE_SERVICE_ACCOUNT_KEY contains invalid JSON');
  });

  it('should throw when GOOGLE_SERVICE_ACCOUNT_KEY is missing type field', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      private_key: 'key',
      client_email: 'test@example.com',
    });
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('Invalid service account: type must be "service_account"');
  });

  it('should throw when GOOGLE_SERVICE_ACCOUNT_KEY is missing private_key', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: 'service_account',
      client_email: 'test@example.com',
    });
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('Invalid service account: missing private_key');
  });

  it('should throw when GOOGLE_SERVICE_ACCOUNT_KEY is missing client_email', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: 'service_account',
      private_key: 'key',
    });
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('Invalid service account: missing client_email');
  });

  it('should pass when GOOGLE_PRIVATE_KEY and GOOGLE_CLIENT_EMAIL are valid', async () => {
    process.env.GOOGLE_PRIVATE_KEY = VALID_PRIVATE_KEY;
    process.env.GOOGLE_CLIENT_EMAIL = VALID_CLIENT_EMAIL;
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).not.toThrow();
  });

  it('should throw when private key format is invalid', async () => {
    process.env.GOOGLE_PRIVATE_KEY = 'invalid-key-format';
    process.env.GOOGLE_CLIENT_EMAIL = VALID_CLIENT_EMAIL;
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('GOOGLE_PRIVATE_KEY appears to be invalid');
  });

  it('should throw when client email format is invalid', async () => {
    process.env.GOOGLE_PRIVATE_KEY = VALID_PRIVATE_KEY;
    process.env.GOOGLE_CLIENT_EMAIL = 'not-an-email';
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('GOOGLE_CLIENT_EMAIL appears to be invalid');
  });

  it('should throw when GOOGLE_PROJECT_ID is missing for file auth', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
    // no GOOGLE_PROJECT_ID
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    expect(() => validateAuth()).toThrow('GOOGLE_PROJECT_ID environment variable is not set');
  });

  it('should extract project_id from service account credentials', async () => {
    delete process.env.GOOGLE_PROJECT_ID;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = VALID_SERVICE_ACCOUNT;
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    validateAuth();
    expect(process.env.GOOGLE_PROJECT_ID).toBe('my-project');
  });

  it('should not override GOOGLE_PROJECT_ID when it is already set', async () => {
    process.env.GOOGLE_PROJECT_ID = 'existing-project';
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = VALID_SERVICE_ACCOUNT;
    const { validateAuth } = await import('../../../src/utils/google-auth.js');
    validateAuth();
    expect(process.env.GOOGLE_PROJECT_ID).toBe('existing-project');
  });
});

describe('getAuthClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_CLIENT_EMAIL;
    delete process.env.GOOGLE_PROJECT_ID;
    vi.resetModules();
    // mock googleapis and google-auth-library
    vi.doMock('googleapis', () => ({
      google: {
        sheets: vi.fn().mockReturnValue({ spreadsheets: {} }),
      },
    }));
    vi.doMock('google-auth-library', () => ({
      GoogleAuth: vi.fn().mockImplementation(function(this: any, opts: any) {
        this._opts = opts;
        this.getClient = vi.fn().mockResolvedValue({});
      }),
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('should create auth client with file credentials', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    const client = await getAuthClient();
    expect(client).toBeDefined();
    expect((client as any)._opts.keyFilename).toBe('/path/to/key.json');
  });

  it('should create auth client with JSON credentials', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = VALID_SERVICE_ACCOUNT;
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    const client = await getAuthClient();
    expect(client).toBeDefined();
    expect((client as any)._opts.credentials).toBeDefined();
  });

  it('should throw when GOOGLE_SERVICE_ACCOUNT_KEY JSON is invalid', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'invalid json';
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    await expect(getAuthClient()).rejects.toThrow('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY');
  });

  it('should create auth client with private key credentials', async () => {
    process.env.GOOGLE_PRIVATE_KEY = VALID_PRIVATE_KEY;
    process.env.GOOGLE_CLIENT_EMAIL = VALID_CLIENT_EMAIL;
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    const client = await getAuthClient();
    expect(client).toBeDefined();
    expect((client as any)._opts.credentials).toBeDefined();
    expect((client as any)._opts.credentials.type).toBe('service_account');
  });

  it('should create auth client with projectId when GOOGLE_PROJECT_ID is set', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
    process.env.GOOGLE_PROJECT_ID = 'my-test-project';
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    const client = await getAuthClient();
    expect((client as any)._opts.projectId).toBe('my-test-project');
  });

  it('should return cached auth client on second call', async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    const client1 = await getAuthClient();
    const client2 = await getAuthClient();
    expect(client1).toBe(client2);
  });

  it('should extract project_id from JSON credentials when not set', async () => {
    delete process.env.GOOGLE_PROJECT_ID;
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = VALID_SERVICE_ACCOUNT;
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    const client = await getAuthClient();
    expect(client).toBeDefined();
    expect((client as any)._opts.projectId).toBe('my-project');
  });

  it('should create auth client using application default credentials when no auth env vars are set', async () => {
    // No env vars set — all cleared in beforeEach; tests default/fallback auth path
    const { getAuthClient } = await import('../../../src/utils/google-auth.js');
    const client = await getAuthClient();
    expect(client).toBeDefined();
    expect((client as any)._opts.keyFilename).toBeUndefined();
    expect((client as any)._opts.credentials).toBeUndefined();
  });
});

describe('getAuthenticatedClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
    vi.resetModules();
    vi.doMock('googleapis', () => ({
      google: {
        sheets: vi.fn().mockReturnValue({ spreadsheets: { values: {} } }),
      },
    }));
    vi.doMock('google-auth-library', () => ({
      GoogleAuth: vi.fn().mockImplementation(function(this: any) {
        this.getClient = vi.fn().mockResolvedValue({});
      }),
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('should return an authenticated sheets client', async () => {
    const { getAuthenticatedClient } = await import('../../../src/utils/google-auth.js');
    const client = await getAuthenticatedClient();
    expect(client).toBeDefined();
    expect(client.spreadsheets).toBeDefined();
  });

  it('should return cached sheets client on second call', async () => {
    const { getAuthenticatedClient } = await import('../../../src/utils/google-auth.js');
    const client1 = await getAuthenticatedClient();
    const client2 = await getAuthenticatedClient();
    expect(client1).toBe(client2);
  });
});
