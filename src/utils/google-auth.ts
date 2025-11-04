import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { GOOGLE_SHEETS_SCOPES } from '../config/constants.js';

let authClient: GoogleAuth | null = null;
let sheetsClient: any = null;

export async function getAuthClient(): Promise<GoogleAuth> {
  if (!authClient) {
    const options: any = {
      scopes: GOOGLE_SHEETS_SCOPES,
    };

    if (process.env.GOOGLE_PROJECT_ID) {
      options.projectId = process.env.GOOGLE_PROJECT_ID;
    }

    // Priority 1: Use file-based authentication if available
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
    // Priority 2: Use JSON string authentication as fallback
    else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        options.credentials = credentials;

        // Extract project ID from credentials if not explicitly set
        if (!options.projectId && credentials.project_id) {
          options.projectId = credentials.project_id;
        }
      } catch (error) {
        throw new Error(
          'Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: Invalid JSON format. ' +
            'Please ensure the environment variable contains valid JSON.'
        );
      }
    }
    // Priority 3: Use private key + email authentication
    else if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
      const credentials = {
        type: 'service_account',
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      };
      options.credentials = credentials;
    }

    authClient = new GoogleAuth(options);
  }
  return authClient;
}

export async function getAuthenticatedClient() {
  if (!sheetsClient) {
    const auth = await getAuthClient();
    const authClient = await auth.getClient();

    sheetsClient = google.sheets({
      version: 'v4',
      auth: authClient as any,
    });
  }

  return sheetsClient;
}

export function validateAuth(): void {
  // Check if at least one authentication method is provided
  const hasFileAuth = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasJsonAuth = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const hasPrivateKeyAuth =
    !!process.env.GOOGLE_PRIVATE_KEY && !!process.env.GOOGLE_CLIENT_EMAIL;

  if (!hasFileAuth && !hasJsonAuth && !hasPrivateKeyAuth) {
    throw new Error(
      'No authentication method provided. Please set one of:\n' +
        '- GOOGLE_APPLICATION_CREDENTIALS to the path of your service account key file\n' +
        '- GOOGLE_SERVICE_ACCOUNT_KEY to the JSON string of your service account credentials\n' +
        '- GOOGLE_PRIVATE_KEY and GOOGLE_CLIENT_EMAIL for direct private key authentication'
    );
  }

  // If using private key authentication, validate both fields are present
  if (!hasFileAuth && !hasJsonAuth && hasPrivateKeyAuth) {
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('GOOGLE_PRIVATE_KEY is required when using private key authentication');
    }
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
      throw new Error('GOOGLE_CLIENT_EMAIL is required when using private key authentication');
    }

    // Validate private key format
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
      throw new Error(
        'GOOGLE_PRIVATE_KEY appears to be invalid. ' +
          'It should start with -----BEGIN PRIVATE KEY----- and end with -----END PRIVATE KEY-----'
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.GOOGLE_CLIENT_EMAIL)) {
      throw new Error(
        'GOOGLE_CLIENT_EMAIL appears to be invalid. ' +
          'It should be a valid email address (e.g., your-service-account@your-project.iam.gserviceaccount.com)'
      );
    }
  }

  // If using JSON authentication, validate it can be parsed
  if (!hasFileAuth && hasJsonAuth) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);

      // Validate required fields in the service account JSON
      if (!credentials.type || credentials.type !== 'service_account') {
        throw new Error('Invalid service account: type must be "service_account"');
      }
      if (!credentials.private_key) {
        throw new Error('Invalid service account: missing private_key');
      }
      if (!credentials.client_email) {
        throw new Error('Invalid service account: missing client_email');
      }

      // Extract project ID from credentials if GOOGLE_PROJECT_ID is not set
      if (!process.env.GOOGLE_PROJECT_ID && credentials.project_id) {
        process.env.GOOGLE_PROJECT_ID = credentials.project_id;
      }
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error(
          'GOOGLE_SERVICE_ACCOUNT_KEY contains invalid JSON. ' +
            'Please ensure it is a valid JSON string.'
        );
      }
      throw error;
    }
  }

  // Validate project ID is available (optional for private key auth as it's not always needed)
  if (!process.env.GOOGLE_PROJECT_ID && !hasPrivateKeyAuth) {
    throw new Error(
      'GOOGLE_PROJECT_ID environment variable is not set. ' +
        'Please set it to your Google Cloud project ID, or ensure it is included in your service account credentials.'
    );
  }
}
