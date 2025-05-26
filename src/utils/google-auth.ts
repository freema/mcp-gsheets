import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { GOOGLE_SHEETS_SCOPES } from '../config/constants.js';

let authClient: GoogleAuth | null = null;
let sheetsClient: any = null;

export async function getAuthClient(): Promise<GoogleAuth> {
  if (!authClient) {
    const options: any = {
      scopes: GOOGLE_SHEETS_SCOPES
    };
    
    if (process.env.GOOGLE_PROJECT_ID) {
      options.projectId = process.env.GOOGLE_PROJECT_ID;
    }
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
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
      auth: authClient as any
    });
  }
  
  return sheetsClient;
}

export function validateAuth(): void {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. ' +
      'Please set it to the path of your service account key file.'
    );
  }
  
  if (!process.env.GOOGLE_PROJECT_ID) {
    throw new Error(
      'GOOGLE_PROJECT_ID environment variable is not set. ' +
      'Please set it to your Google Cloud project ID.'
    );
  }
}