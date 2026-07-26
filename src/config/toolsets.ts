/**
 * Toolset filtering.
 *
 * All 44 tools together serialise to ~39 KB of `tools/list`, roughly 9,900
 * tokens of context in every session — before the model has done anything.
 * Most users need a fraction of that: reading and writing values, maybe sheet
 * management. `GSHEETS_TOOLSETS` lets them pay only for what they use
 * (`core` alone is ~2,000).
 *
 * Defaults to every toolset, so an existing config keeps working untouched.
 */

/** Toolset names, in the order they are listed to the user. */
export const TOOLSET_NAMES = [
  'core',
  'sheets',
  'formatting',
  'charts',
  'tables',
  'analysis',
] as const;

export type ToolsetName = (typeof TOOLSET_NAMES)[number];

/**
 * Which tools belong to which toolset. Every tool appears exactly once; the
 * `toolsets are exhaustive` test keeps this honest against the real registry.
 */
export const TOOLSETS: Record<ToolsetName, readonly string[]> = {
  /** Reading and writing cells, plus the metadata needed to do it safely. */
  core: [
    'sheets_check_access',
    'sheets_get_metadata',
    'sheets_get_sheet_structure',
    'sheets_get_sheet_dimensions',
    'sheets_get_values',
    'sheets_batch_get_values',
    'sheets_update_values',
    'sheets_batch_update_values',
    'sheets_append_values',
    'sheets_clear_values',
    'sheets_create_spreadsheet',
  ],
  /** Sheet lifecycle and row/column structure. */
  sheets: [
    'sheets_insert_sheet',
    'sheets_delete_sheet',
    'sheets_duplicate_sheet',
    'sheets_copy_to',
    'sheets_update_sheet_properties',
    'sheets_batch_delete_sheets',
    'sheets_insert_rows',
    'sheets_delete_rows',
    'sheets_delete_columns',
  ],
  /** Cell appearance: colours, borders, merges, conditional rules, links. */
  formatting: [
    'sheets_format_cells',
    'sheets_batch_format_cells',
    'sheets_update_borders',
    'sheets_get_border_map',
    'sheets_merge_cells',
    'sheets_unmerge_cells',
    'sheets_get_merged_cells',
    'sheets_get_sheet_formatting',
    'sheets_get_formatting_compact',
    'sheets_add_conditional_formatting',
    'sheets_get_conditional_formatting',
    'sheets_get_data_validation',
    'sheets_get_basic_filter',
    'sheets_insert_link',
    'sheets_insert_date',
  ],
  charts: ['sheets_create_chart', 'sheets_update_chart', 'sheets_delete_chart'],
  tables: ['sheets_add_table', 'sheets_update_table', 'sheets_delete_table', 'sheets_get_tables'],
  /** Whole-sheet reads and diffing — powerful, but the heaviest schemas. */
  analysis: ['sheets_get_full_sheet_snapshot', 'sheets_compare_ranges'],
};

/**
 * Tools that only read. Used both for `GSHEETS_READ_ONLY` and to emit
 * `readOnlyHint` annotations so clients can skip confirmation prompts.
 */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  'sheets_check_access',
  'sheets_get_metadata',
  'sheets_get_sheet_structure',
  'sheets_get_sheet_dimensions',
  'sheets_get_values',
  'sheets_batch_get_values',
  'sheets_get_border_map',
  'sheets_get_merged_cells',
  'sheets_get_sheet_formatting',
  'sheets_get_formatting_compact',
  'sheets_get_conditional_formatting',
  'sheets_get_data_validation',
  'sheets_get_basic_filter',
  'sheets_get_tables',
  'sheets_get_full_sheet_snapshot',
  'sheets_compare_ranges',
]);

/**
 * Tools that remove data outright, as opposed to overwriting it. Surfaced as
 * `destructiveHint` so a client can warn before running them.
 */
const DESTRUCTIVE_TOOLS: ReadonlySet<string> = new Set([
  'sheets_clear_values',
  'sheets_delete_sheet',
  'sheets_batch_delete_sheets',
  'sheets_delete_rows',
  'sheets_delete_columns',
  'sheets_delete_chart',
  'sheets_delete_table',
  'sheets_unmerge_cells',
]);

export interface ToolsetConfig {
  /** Toolsets that were requested, after defaulting and adding `core`. */
  enabled: ToolsetName[];
  readOnly: boolean;
  /** Tool names the server should expose and accept calls for. */
  allowed: ReadonlySet<string>;
}

export class ToolsetConfigError extends Error {}

function parseList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve the active toolsets from the environment.
 *
 * - Unset, empty, or `all` → every toolset (the pre-existing behaviour).
 * - `core` is always added: without it the server cannot read a cell, and a
 *   config like `GSHEETS_TOOLSETS=charts` is far more likely to mean "charts
 *   as well" than "charts and nothing else".
 * - An unknown name throws rather than being skipped — a typo that silently
 *   drops half the tools is much harder to debug than a startup failure.
 */
export function resolveToolsets(env: NodeJS.ProcessEnv = process.env): ToolsetConfig {
  const raw = env.GSHEETS_TOOLSETS?.trim();
  const readOnly = env.GSHEETS_READ_ONLY?.trim().toLowerCase() === 'true';

  let enabled: ToolsetName[];
  if (!raw || raw.toLowerCase() === 'all') {
    enabled = [...TOOLSET_NAMES];
  } else {
    const requested = parseList(raw);
    const unknown = requested.filter((n) => !TOOLSET_NAMES.includes(n as ToolsetName));
    if (unknown.length > 0) {
      throw new ToolsetConfigError(
        `Unknown toolset${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. ` +
          `Valid toolsets: ${TOOLSET_NAMES.join(', ')}, all.`
      );
    }
    const set = new Set<ToolsetName>(requested as ToolsetName[]);
    set.add('core');
    enabled = TOOLSET_NAMES.filter((n) => set.has(n));
  }

  const allowed = new Set<string>();
  for (const name of enabled) {
    for (const tool of TOOLSETS[name]) {
      if (readOnly && !READ_ONLY_TOOLS.has(tool)) {
        continue;
      }
      allowed.add(tool);
    }
  }

  return { enabled, readOnly, allowed };
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
}

/**
 * MCP tool annotations derived from the read-only / destructive classification.
 *
 * Only hints that differ from the spec defaults are emitted. Annotations ride
 * along in every `tools/list`, and spelling out `openWorldHint: true` on all
 * 44 tools costs real context to say nothing. Spec defaults are
 * `readOnlyHint: false`, `destructiveHint: true`, `idempotentHint: false`,
 * `openWorldHint: true` — the last is correct for every tool here, since they
 * all talk to the Google Sheets API.
 */
export function annotationsFor(toolName: string): ToolAnnotations {
  if (READ_ONLY_TOOLS.has(toolName)) {
    // destructiveHint is only meaningful for writes, so it is left off.
    return { readOnlyHint: true, idempotentHint: true };
  }

  const annotations: ToolAnnotations = {};
  // Default is destructive; only the reassuring case is worth stating.
  if (!DESTRUCTIVE_TOOLS.has(toolName)) {
    annotations.destructiveHint = false;
  }
  // Reads and full-range writes land on the same result when repeated;
  // appends do not.
  if (toolName !== 'sheets_append_values') {
    annotations.idempotentHint = true;
  }
  return annotations;
}
