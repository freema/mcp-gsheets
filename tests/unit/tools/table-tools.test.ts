import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addTableHandler } from '../../../src/tools/add-table';
import { updateTableHandler } from '../../../src/tools/update-table';
import { deleteTableHandler } from '../../../src/tools/delete-table';
import { getTablesHandler } from '../../../src/tools/get-tables';
import * as googleAuth from '../../../src/utils/google-auth';
import * as errorHandler from '../../../src/utils/error-handler';

vi.mock('../../../src/utils/google-auth');
vi.mock('../../../src/utils/error-handler');

describe('native table tools', () => {
  const mockSheets = {
    spreadsheets: {
      get: vi.fn(),
      batchUpdate: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(googleAuth.getAuthenticatedClient).mockResolvedValue(mockSheets as any);
  });

  describe('addTableHandler', () => {
    it('should create a table with dropdown validation columns', async () => {
      mockSheets.spreadsheets.get
        .mockResolvedValueOnce({
          data: {
            sheets: [{ properties: { title: 'Sheet1', sheetId: 0 } }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            sheets: [{ properties: { title: 'Sheet1', sheetId: 0 }, tables: [] }],
          },
        });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: {
          spreadsheetId: 'test-id',
          replies: [
            {
              addTable: {
                table: {
                  tableId: 'table-1',
                  name: 'Tasks',
                  range: {
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 10,
                    startColumnIndex: 0,
                    endColumnIndex: 2,
                  },
                  columnProperties: [],
                },
              },
            },
          ],
        },
      });

      const result = await addTableHandler({
        spreadsheetId: 'test-id',
        sheetName: 'Sheet1',
        range: 'A1:B10',
        name: 'Tasks',
        columns: [
          { name: 'Task', columnType: 'TEXT' },
          { name: 'Status', columnType: 'DROPDOWN', dropdownValues: ['Todo', 'Done'] },
        ],
      });

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        requestBody: {
          requests: [
            {
              addTable: {
                table: {
                  name: 'Tasks',
                  range: {
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 10,
                    startColumnIndex: 0,
                    endColumnIndex: 2,
                  },
                  columnProperties: [
                    { columnIndex: 0, columnName: 'Task', columnType: 'TEXT' },
                    {
                      columnIndex: 1,
                      columnName: 'Status',
                      columnType: 'DROPDOWN',
                      dataValidationRule: {
                        condition: {
                          type: 'ONE_OF_LIST',
                          values: [{ userEnteredValue: 'Todo' }, { userEnteredValue: 'Done' }],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      });
      expect(result.content[0].text).toContain('Successfully created table "Tasks"');
    });

    it('should return a clear error for overlapping tables', async () => {
      mockSheets.spreadsheets.get
        .mockResolvedValueOnce({
          data: {
            sheets: [{ properties: { title: 'Sheet1', sheetId: 0 } }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            sheets: [
              {
                properties: { title: 'Sheet1', sheetId: 0 },
                tables: [
                  {
                    tableId: 'existing',
                    name: 'Existing',
                    range: {
                      sheetId: 0,
                      startRowIndex: 0,
                      endRowIndex: 5,
                      startColumnIndex: 0,
                      endColumnIndex: 2,
                    },
                  },
                ],
              },
            ],
          },
        });
      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'Error: overlaps existing table' }],
      } as any);

      const result = await addTableHandler({
        spreadsheetId: 'test-id',
        sheetName: 'Sheet1',
        range: 'A1:B10',
        name: 'Tasks',
        columns: [
          { name: 'Task', columnType: 'TEXT' },
          { name: 'Status', columnType: 'TEXT' },
        ],
      });

      expect(errorHandler.handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('overlaps existing table') })
      );
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('overlaps');
    });
  });

  describe('updateTableHandler', () => {
    it('should update a table with the required field mask', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            {
              properties: { title: 'Sheet1', sheetId: 0 },
              tables: [{ tableId: 'table-1', name: 'Old Name' }],
            },
          ],
        },
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { spreadsheetId: 'test-id' },
      });

      await updateTableHandler({
        spreadsheetId: 'test-id',
        tableId: 'table-1',
        fields: 'name',
        name: 'New Name',
      });

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        requestBody: {
          requests: [
            {
              updateTable: {
                table: {
                  tableId: 'table-1',
                  name: 'New Name',
                },
                fields: 'name',
              },
            },
          ],
        },
      });
    });

    it('should fail validation when fields is missing', async () => {
      vi.mocked(errorHandler.handleError).mockReturnValue({
        content: [{ type: 'text', text: 'Error: validation' }],
      } as any);

      await updateTableHandler({ spreadsheetId: 'test-id', tableId: 'table-1', name: 'New Name' });

      expect(errorHandler.handleError).toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });
  });

  describe('deleteTableHandler', () => {
    it('should delete a table by tableId', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: { sheets: [{ tables: [{ tableId: 'table-1' }] }] },
      });
      mockSheets.spreadsheets.batchUpdate.mockResolvedValue({
        data: { spreadsheetId: 'test-id' },
      });

      const result = await deleteTableHandler({ spreadsheetId: 'test-id', tableId: 'table-1' });

      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        requestBody: {
          requests: [{ deleteTable: { tableId: 'table-1' } }],
        },
      });
      expect(result.content[0].text).toContain('Successfully deleted table "table-1"');
    });
  });

  describe('getTablesHandler', () => {
    it('should read tables for a specific sheet', async () => {
      mockSheets.spreadsheets.get.mockResolvedValue({
        data: {
          sheets: [
            {
              properties: { title: 'Sheet1', sheetId: 0 },
              tables: [
                {
                  tableId: 'table-1',
                  name: 'Tasks',
                  range: {
                    sheetId: 0,
                    startRowIndex: 0,
                    endRowIndex: 10,
                    startColumnIndex: 0,
                    endColumnIndex: 2,
                  },
                  columnProperties: [{ columnIndex: 0, columnName: 'Task', columnType: 'TEXT' }],
                },
              ],
            },
          ],
        },
      });

      const result = await getTablesHandler({ spreadsheetId: 'test-id', sheetName: 'Sheet1' });

      expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
        spreadsheetId: 'test-id',
        fields: 'sheets.properties.title,sheets.properties.sheetId,sheets.tables',
      });
      const parsed = JSON.parse(result.content[0].text!.split('\n\n')[1]);
      expect(parsed.tableCount).toBe(1);
      expect(parsed.tables[0]).toMatchObject({
        sheetName: 'Sheet1',
        sheetId: 0,
        tableId: 'table-1',
        name: 'Tasks',
        range: 'Sheet1!A1:B10',
      });
    });
  });
});
