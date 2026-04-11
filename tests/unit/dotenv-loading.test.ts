import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const INDEX_PATH = path.resolve(__dirname, '../../src/index.ts');

/**
 * Spawns the server entry point with tsx and captures stderr.
 * Sends a short timeout to avoid hanging (the server listens on stdin).
 */
async function getStderrWithEnv(nodeEnv: string | undefined): Promise<string> {
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    PATH: process.env.PATH || '',
  };

  if (nodeEnv !== undefined) {
    env.NODE_ENV = nodeEnv;
  } else {
    delete env.NODE_ENV;
  }

  // We don't need GOOGLE_APPLICATION_CREDENTIALS for this test —
  // we just need to see whether dotenv loading produces stderr output
  // before the server errors out on missing credentials.
  delete env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    const { stderr } = await execFileAsync(
      'npx',
      ['tsx', INDEX_PATH],
      {
        env,
        timeout: 3000,
        // Close stdin immediately so the process exits
        // (StdioServerTransport will error when stdin closes)
      },
    );
    return stderr;
  } catch (error: any) {
    // The process will exit with an error (missing credentials or stdin close),
    // but we only care about stderr content before that happens.
    return error.stderr || '';
  }
}

describe('dotenv loading', () => {
  it('should NOT attempt to load dotenv when NODE_ENV is unset', async () => {
    const stderr = await getStderrWithEnv(undefined);
    expect(stderr).not.toContain('Failed to load .env file');
    expect(stderr).not.toContain('Loaded .env file');
  }, 10000);

  it('should NOT attempt to load dotenv when NODE_ENV is "production"', async () => {
    const stderr = await getStderrWithEnv('production');
    expect(stderr).not.toContain('Failed to load .env file');
    expect(stderr).not.toContain('Loaded .env file');
  }, 10000);

  it('should NOT attempt to load dotenv when NODE_ENV is "test"', async () => {
    const stderr = await getStderrWithEnv('test');
    expect(stderr).not.toContain('Failed to load .env file');
    expect(stderr).not.toContain('Loaded .env file');
  }, 10000);

  it('should attempt to load dotenv when NODE_ENV is "development"', async () => {
    const stderr = await getStderrWithEnv('development');
    // In development mode, dotenv should be attempted.
    // It will either succeed ("Loaded .env file") or fail ("Failed to load .env file").
    // Either way, it should have tried.
    const triedDotenv =
      stderr.includes('Loaded .env file') ||
      stderr.includes('Failed to load .env file');
    expect(triedDotenv).toBe(true);
  }, 10000);
});
