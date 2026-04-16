import { sheets_v4 } from 'googleapis';
import { colIndexToLetter } from './range-helpers.js';

/**
 * Extract specific format fields from a CellFormat object.
 * If fields is empty or undefined, all non-null properties are returned.
 */
export function extractFormatFields(
  fmt: sheets_v4.Schema$CellFormat,
  fields?: string[]
): Record<string, unknown> {
  const all: Record<string, unknown> = {};
  if (fmt.backgroundColor !== null && fmt.backgroundColor !== undefined) {
    all.backgroundColor = fmt.backgroundColor;
  }
  if (fmt.backgroundColorStyle !== null && fmt.backgroundColorStyle !== undefined) {
    all.backgroundColorStyle = fmt.backgroundColorStyle;
  }
  if (fmt.textFormat !== null && fmt.textFormat !== undefined) {
    all.textFormat = fmt.textFormat;
  }
  if (fmt.horizontalAlignment !== null && fmt.horizontalAlignment !== undefined) {
    all.horizontalAlignment = fmt.horizontalAlignment;
  }
  if (fmt.verticalAlignment !== null && fmt.verticalAlignment !== undefined) {
    all.verticalAlignment = fmt.verticalAlignment;
  }
  if (fmt.wrapStrategy !== null && fmt.wrapStrategy !== undefined) {
    all.wrapStrategy = fmt.wrapStrategy;
  }
  if (fmt.textRotation !== null && fmt.textRotation !== undefined) {
    all.textRotation = fmt.textRotation;
  }
  if (fmt.numberFormat !== null && fmt.numberFormat !== undefined) {
    all.numberFormat = fmt.numberFormat;
  }
  if (fmt.padding !== null && fmt.padding !== undefined) {
    all.padding = fmt.padding;
  }
  if (fmt.borders !== null && fmt.borders !== undefined) {
    all.borders = fmt.borders;
  }
  if (!fields || fields.length === 0) {
    return all;
  }
  return Object.fromEntries(Object.entries(all).filter(([k]) => fields.includes(k)));
}

interface RangeEntry {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  fmt: Record<string, unknown>;
}

/**
 * Collapse per-cell format data into A1Range→format pairs using 2D run-length encoding.
 * Cells are first grouped into horizontal runs per row, then consecutive identical runs
 * are merged vertically into rectangular ranges. Reduces typical output by 90%+.
 *
 * @param rowData     - Array of RowData from the Sheets API
 * @param startRow    - 0-based row index of the first row in rowData (gridData.startRow)
 * @param startColumn - 0-based column index of the first column (gridData.startColumn)
 * @param useEffectiveFormat - Whether to read effectiveFormat or userEnteredFormat
 * @param fields      - Optional field name filter (e.g. ["backgroundColor", "textFormat"])
 * @returns Object mapping A1 range strings to their shared format object
 */
export function compactifyCellFormatting(
  rowData: sheets_v4.Schema$RowData[],
  startRow: number,
  startColumn: number,
  useEffectiveFormat: boolean,
  fields?: string[]
): Record<string, unknown> {
  // Determine max column count across all rows
  let maxCols = 0;
  for (const row of rowData) {
    const len = row.values?.length ?? 0;
    if (len > maxCols) {
      maxCols = len;
    }
  }

  // Build 2D grid of { key, fmt } — key is JSON of the filtered format (or '' for empty)
  const grid: Array<Array<{ key: string; fmt: Record<string, unknown> | null }>> = [];
  for (const rowVals of rowData) {
    const values = rowVals.values ?? [];
    const rowArr: Array<{ key: string; fmt: Record<string, unknown> | null }> = [];
    for (let c = 0; c < maxCols; c++) {
      const cell = values[c];
      if (!cell) {
        rowArr.push({ key: '', fmt: null });
        continue;
      }
      const rawFmt = useEffectiveFormat ? cell.effectiveFormat : cell.userEnteredFormat;
      if (!rawFmt) {
        rowArr.push({ key: '', fmt: null });
        continue;
      }
      const extracted = extractFormatFields(rawFmt, fields);
      if (Object.keys(extracted).length === 0) {
        rowArr.push({ key: '', fmt: null });
        continue;
      }
      rowArr.push({ key: JSON.stringify(extracted), fmt: extracted });
    }
    grid.push(rowArr);
  }

  // Row-by-row horizontal RLE with vertical merging of identical consecutive runs.
  // openRanges: currently open (not yet closed) rectangular ranges, keyed by
  //   "startCol-endCol-formatKey" — this key uniquely identifies a "run shape".
  const openRanges = new Map<string, RangeEntry>();
  const closedRanges: RangeEntry[] = [];

  for (const [r, row] of grid.entries()) {
    // Identify horizontal runs within this row
    const runs: Array<{
      startCol: number;
      endCol: number;
      key: string;
      fmt: Record<string, unknown> | null;
    }> = [];
    if (row.length > 0) {
      let runStart = 0;
      for (let c = 1; c <= row.length; c++) {
        const currentKey = c < row.length ? row[c]!.key : null;
        if (currentKey !== row[runStart]!.key) {
          runs.push({
            startCol: runStart,
            endCol: c - 1,
            key: row[runStart]!.key,
            fmt: row[runStart]!.fmt,
          });
          runStart = c;
        }
      }
    }

    // Try to extend open ranges or start new ones
    const newOpen = new Map<string, RangeEntry>();
    for (const run of runs) {
      if (!run.key || !run.fmt) {
        continue;
      } // skip empty/null cells
      const mapKey = `${run.startCol}-${run.endCol}-${run.key}`;
      if (openRanges.has(mapKey)) {
        // Same run shape as previous row — extend downward
        const entry = openRanges.get(mapKey)!;
        entry.endRow = r;
        newOpen.set(mapKey, entry);
      } else {
        // New run — start a fresh range
        newOpen.set(mapKey, {
          startRow: r,
          endRow: r,
          startCol: run.startCol,
          endCol: run.endCol,
          fmt: run.fmt,
        });
      }
    }

    // Close any open ranges that did not continue into this row
    for (const [key, entry] of openRanges) {
      if (!newOpen.has(key)) {
        closedRanges.push(entry);
      }
    }
    openRanges.clear();
    for (const [k, v] of newOpen) {
      openRanges.set(k, v);
    }
  }

  // Close remaining open ranges at the end of the grid
  for (const [, entry] of openRanges) {
    closedRanges.push(entry);
  }

  // Convert internal coordinates to A1 notation
  const result: Record<string, unknown> = {};
  for (const rng of closedRanges) {
    const c1 = colIndexToLetter(startColumn + rng.startCol);
    const c2 = colIndexToLetter(startColumn + rng.endCol);
    const r1 = startRow + rng.startRow + 1; // convert to 1-based
    const r2 = startRow + rng.endRow + 1;
    const a1 = r1 === r2 && c1 === c2 ? `${c1}${r1}` : `${c1}${r1}:${c2}${r2}`;
    result[a1] = rng.fmt;
  }
  return result;
}
