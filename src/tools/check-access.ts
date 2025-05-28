import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { z } from 'zod';

const CheckAccessSchema = z.object({
  spreadsheetId: z.string().describe('The ID of the spreadsheet to check access for'),
});

export const checkAccessTool: Tool = {
  name: 'sheets_check_access',
  description:
    'Check access permissions for a spreadsheet. Returns information about what operations are allowed.',
  inputSchema: {
    type: 'object',
    properties: {
      spreadsheetId: {
        type: 'string',
        description: 'The ID of the spreadsheet to check access for',
      },
    },
    required: ['spreadsheetId'],
  },
};

export async function handleCheckAccess(input: any) {
  try {
    const { spreadsheetId } = CheckAccessSchema.parse(input);
    const sheets = await getAuthenticatedClient();

    const permissions = {
      canRead: false,
      canWrite: false,
      canShare: false,
      isOwner: false,
      error: null as string | null,
    };

    try {
      // Try to read spreadsheet metadata
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties.sheetId,sheets.properties.title',
      });

      permissions.canRead = true;

      // Try to create a test request (but don't execute it) to check write permissions
      try {
        // Test write access by trying to prepare a values update
        await sheets.spreadsheets.values.update(
          {
            spreadsheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            requestBody: {
              values: [['']],
            },
          },
          {
            // Use validateOnly to not actually write
            params: {
              validateOnly: true,
            },
          }
        );
        permissions.canWrite = true;
      } catch (writeError: any) {
        if (writeError.code === 403) {
          permissions.canWrite = false;
        } else if (writeError.code !== 400) {
          // 400 might mean invalid range, but we have access
          permissions.canWrite = true;
        }
      }

      return {
        spreadsheetId,
        title: response.data.properties?.title || 'Unknown',
        permissions,
        sheets:
          response.data.sheets?.map((sheet: any) => ({
            sheetId: sheet.properties?.sheetId,
            title: sheet.properties?.title,
          })) || [],
        recommendation: permissions.canWrite
          ? 'You have full read/write access to this spreadsheet.'
          : 'You have read-only access to this spreadsheet. To write data, the spreadsheet owner needs to grant you Editor permissions.',
      };
    } catch (error: any) {
      if (error.code === 404) {
        permissions.error = 'Spreadsheet not found. Check if the ID is correct.';
      } else if (error.code === 403) {
        permissions.error =
          'Access denied. The spreadsheet needs to be shared with your service account.';
      } else {
        permissions.error = error.message || 'Unknown error occurred';
      }

      return {
        spreadsheetId,
        permissions,
        error: permissions.error,
        recommendation:
          'Share the spreadsheet with your service account email and grant appropriate permissions.',
      };
    }
  } catch (error) {
    return handleError(error);
  }
}
