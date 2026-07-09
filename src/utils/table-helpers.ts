import { sheets_v4 } from 'googleapis';
import { extractSheetName, gridRangeToA1 } from './range-helpers.js';

export const TABLE_COLUMN_TYPES = [
  'COLUMN_TYPE_UNSPECIFIED',
  'DOUBLE',
  'CURRENCY',
  'PERCENT',
  'DATE',
  'TIME',
  'DATE_TIME',
  'TEXT',
  'BOOLEAN',
  'DROPDOWN',
  'FILES_CHIP',
  'PEOPLE_CHIP',
  'FINANCE_CHIP',
  'PLACE_CHIP',
  'RATINGS_CHIP',
] as const;

export type TableColumnType = (typeof TABLE_COLUMN_TYPES)[number];

export interface TableColumnInput {
  name: string;
  columnType: TableColumnType;
  dropdownValues?: string[] | undefined;
}

export function resolveTableRangeInput(
  sheetName: string,
  range: string
): { sheetName: string; range: string } {
  const extracted = extractSheetName(range);

  if (extracted.sheetName && extracted.sheetName !== sheetName) {
    throw new Error(`Range sheet "${extracted.sheetName}" does not match sheetName "${sheetName}"`);
  }

  return {
    sheetName: extracted.sheetName ?? sheetName,
    range: extracted.range,
  };
}

export function buildTableColumnProperties(
  columns: TableColumnInput[]
): sheets_v4.Schema$TableColumnProperties[] {
  return columns.map((column, index) => {
    const columnProperties: sheets_v4.Schema$TableColumnProperties = {
      columnIndex: index,
      columnName: column.name,
      columnType: column.columnType,
    };

    if (column.dropdownValues && column.dropdownValues.length > 0) {
      columnProperties.dataValidationRule = {
        condition: {
          type: 'ONE_OF_LIST',
          values: column.dropdownValues.map((value) => ({ userEnteredValue: value })),
        },
      };
    }

    return columnProperties;
  });
}

export function getRangeColumnCount(range: sheets_v4.Schema$GridRange): number | undefined {
  if (
    range.startColumnIndex === undefined ||
    range.startColumnIndex === null ||
    range.endColumnIndex === undefined ||
    range.endColumnIndex === null
  ) {
    return undefined;
  }

  return range.endColumnIndex - range.startColumnIndex;
}

export function validateTableGridRange(range: sheets_v4.Schema$GridRange, rangeText: string): void {
  const startRow = range.startRowIndex;
  const endRow = range.endRowIndex;
  const startColumn = range.startColumnIndex;
  const endColumn = range.endColumnIndex;

  if (
    startRow === undefined ||
    startRow === null ||
    endRow === undefined ||
    endRow === null ||
    startColumn === undefined ||
    startColumn === null ||
    endColumn === undefined ||
    endColumn === null ||
    startRow < 0 ||
    startColumn < 0 ||
    endRow <= startRow ||
    endColumn <= startColumn
  ) {
    throw new Error(`Invalid table range: ${rangeText}. Use a rectangular A1 range like "A1:D20".`);
  }
}

export function validateColumnCount(
  range: sheets_v4.Schema$GridRange,
  columns: TableColumnInput[],
  rangeText: string
): void {
  const columnCount = getRangeColumnCount(range);

  if (columnCount !== undefined && columnCount !== columns.length) {
    throw new Error(
      `Column count mismatch: range ${rangeText} spans ${columnCount} column(s), but ${columns.length} column definition(s) were provided`
    );
  }
}

export function rangesOverlap(
  first: sheets_v4.Schema$GridRange,
  second: sheets_v4.Schema$GridRange
): boolean {
  if (
    first.sheetId !== undefined &&
    first.sheetId !== null &&
    second.sheetId !== undefined &&
    second.sheetId !== null &&
    first.sheetId !== second.sheetId
  ) {
    return false;
  }

  const firstStartRow = first.startRowIndex ?? 0;
  const firstEndRow = first.endRowIndex ?? Number.POSITIVE_INFINITY;
  const firstStartColumn = first.startColumnIndex ?? 0;
  const firstEndColumn = first.endColumnIndex ?? Number.POSITIVE_INFINITY;

  const secondStartRow = second.startRowIndex ?? 0;
  const secondEndRow = second.endRowIndex ?? Number.POSITIVE_INFINITY;
  const secondStartColumn = second.startColumnIndex ?? 0;
  const secondEndColumn = second.endColumnIndex ?? Number.POSITIVE_INFINITY;

  return (
    firstStartRow < secondEndRow &&
    firstEndRow > secondStartRow &&
    firstStartColumn < secondEndColumn &&
    firstEndColumn > secondStartColumn
  );
}

export function ensureNoOverlappingTable(
  tables: sheets_v4.Schema$Table[],
  range: sheets_v4.Schema$GridRange,
  sheetName: string,
  excludeTableId?: string
): void {
  const overlappingTable = tables.find(
    (table) => table.tableId !== excludeTableId && table.range && rangesOverlap(table.range, range)
  );

  if (!overlappingTable) {
    return;
  }

  const existingRange = overlappingTable.range ? gridRangeToA1(overlappingTable.range) : 'unknown';
  const requestedRange = gridRangeToA1(range);
  const tableLabel = overlappingTable.name || overlappingTable.tableId || 'unnamed table';

  throw new Error(
    `Table range ${sheetName}!${requestedRange} overlaps existing table "${tableLabel}" (${sheetName}!${existingRange}). Choose a non-overlapping range or update/delete the existing table.`
  );
}

export function formatTableForResponse(
  table: sheets_v4.Schema$Table,
  sheetName?: string
): {
  tableId: string | null;
  name: string | null;
  range: string | null;
  gridRange: sheets_v4.Schema$GridRange | null;
  columnProperties: sheets_v4.Schema$TableColumnProperties[];
} {
  const range = table.range ? gridRangeToA1(table.range) : null;

  return {
    tableId: table.tableId ?? null,
    name: table.name ?? null,
    range: range && sheetName ? `${sheetName}!${range}` : range,
    gridRange: table.range ?? null,
    columnProperties: table.columnProperties ?? [],
  };
}
