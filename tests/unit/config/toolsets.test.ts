import { describe, it, expect } from 'vitest';

import {
  TOOLSETS,
  TOOLSET_NAMES,
  READ_ONLY_TOOLS,
  resolveToolsets,
  annotationsFor,
  ToolsetConfigError,
} from '../../../src/config/toolsets.js';
import * as tools from '../../../src/tools/index.js';

/** Every tool the server actually registers, read straight from the barrel. */
const REGISTERED_TOOL_NAMES: string[] = Object.values(tools)
  .filter(
    (v): v is { name: string } =>
      typeof v === 'object' && v !== null && typeof (v as { name?: unknown }).name === 'string'
  )
  .map((t) => t.name)
  .filter((n) => n.startsWith('sheets_'));

const ALL_GROUPED = Object.values(TOOLSETS).flat();

describe('toolset definitions', () => {
  it('covers every registered tool exactly once', () => {
    // The guard that matters: add a tool and forget to file it, and this fails
    // rather than the tool silently vanishing from every non-default config.
    const grouped = new Set(ALL_GROUPED);
    const registered = new Set(REGISTERED_TOOL_NAMES);

    expect([...registered].filter((n) => !grouped.has(n))).toEqual([]);
    expect([...grouped].filter((n) => !registered.has(n))).toEqual([]);
    expect(ALL_GROUPED.length).toBe(new Set(ALL_GROUPED).size);
  });

  it('classifies only registered tools as read-only', () => {
    const registered = new Set(REGISTERED_TOOL_NAMES);
    expect([...READ_ONLY_TOOLS].filter((n) => !registered.has(n))).toEqual([]);
  });

  it('keeps core self-sufficient for reading and writing values', () => {
    for (const tool of [
      'sheets_get_values',
      'sheets_update_values',
      'sheets_get_metadata',
      'sheets_check_access',
    ]) {
      expect(TOOLSETS.core).toContain(tool);
    }
  });
});

describe('resolveToolsets', () => {
  it('enables everything when unset', () => {
    const { enabled, readOnly, allowed } = resolveToolsets({});
    expect(enabled).toEqual([...TOOLSET_NAMES]);
    expect(readOnly).toBe(false);
    expect(allowed.size).toBe(REGISTERED_TOOL_NAMES.length);
  });

  it('enables everything for "all"', () => {
    expect(resolveToolsets({ GSHEETS_TOOLSETS: 'all' }).enabled).toEqual([...TOOLSET_NAMES]);
  });

  it('enables everything for an empty or whitespace value', () => {
    expect(resolveToolsets({ GSHEETS_TOOLSETS: '' }).enabled).toEqual([...TOOLSET_NAMES]);
    expect(resolveToolsets({ GSHEETS_TOOLSETS: '   ' }).enabled).toEqual([...TOOLSET_NAMES]);
  });

  it('restricts to the named toolsets', () => {
    const { enabled, allowed } = resolveToolsets({ GSHEETS_TOOLSETS: 'core,charts' });
    expect(enabled).toEqual(['core', 'charts']);
    expect(allowed.has('sheets_create_chart')).toBe(true);
    expect(allowed.has('sheets_get_values')).toBe(true);
    expect(allowed.has('sheets_format_cells')).toBe(false);
  });

  it('always adds core, even when not requested', () => {
    const { enabled, allowed } = resolveToolsets({ GSHEETS_TOOLSETS: 'charts' });
    expect(enabled).toEqual(['core', 'charts']);
    expect(allowed.has('sheets_get_values')).toBe(true);
  });

  it('is tolerant of spacing and case', () => {
    expect(resolveToolsets({ GSHEETS_TOOLSETS: ' Charts , TABLES ' }).enabled).toEqual([
      'core',
      'charts',
      'tables',
    ]);
  });

  it('returns toolsets in declaration order regardless of input order', () => {
    expect(resolveToolsets({ GSHEETS_TOOLSETS: 'analysis,charts,core' }).enabled).toEqual([
      'core',
      'charts',
      'analysis',
    ]);
  });

  it('ignores duplicates', () => {
    expect(resolveToolsets({ GSHEETS_TOOLSETS: 'charts,charts' }).enabled).toEqual([
      'core',
      'charts',
    ]);
  });

  it('throws on an unknown toolset rather than silently dropping it', () => {
    expect(() => resolveToolsets({ GSHEETS_TOOLSETS: 'core,chart' })).toThrow(ToolsetConfigError);
    expect(() => resolveToolsets({ GSHEETS_TOOLSETS: 'core,chart' })).toThrow(
      /Unknown toolset: chart\./
    );
  });

  it('lists every unknown name and the valid ones', () => {
    try {
      resolveToolsets({ GSHEETS_TOOLSETS: 'nope,alsonope' });
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('Unknown toolsets: nope, alsonope');
      expect(message).toContain('core, sheets, formatting, charts, tables, analysis, all');
    }
  });
});

describe('GSHEETS_READ_ONLY', () => {
  it('drops every writing tool', () => {
    const { readOnly, allowed } = resolveToolsets({ GSHEETS_READ_ONLY: 'true' });
    expect(readOnly).toBe(true);
    expect(allowed.size).toBe(READ_ONLY_TOOLS.size);
    for (const name of allowed) expect(READ_ONLY_TOOLS.has(name)).toBe(true);
  });

  it('intersects with the toolset filter', () => {
    const { allowed } = resolveToolsets({
      GSHEETS_TOOLSETS: 'core,charts',
      GSHEETS_READ_ONLY: 'true',
    });
    expect(allowed.has('sheets_get_values')).toBe(true);
    expect(allowed.has('sheets_update_values')).toBe(false);
    // charts has no read-only member, so it contributes nothing here
    expect(allowed.has('sheets_create_chart')).toBe(false);
  });

  it('is off unless the value is exactly true', () => {
    for (const value of ['false', '1', 'yes', '']) {
      expect(resolveToolsets({ GSHEETS_READ_ONLY: value }).readOnly).toBe(false);
    }
    expect(resolveToolsets({ GSHEETS_READ_ONLY: 'TRUE' }).readOnly).toBe(true);
  });
});

describe('annotationsFor', () => {
  it('marks reads read-only and idempotent', () => {
    expect(annotationsFor('sheets_get_values')).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
    });
  });

  it('leaves deletes at the destructive default', () => {
    // destructiveHint defaults to true, so a delete needs no annotation for it
    const annotations = annotationsFor('sheets_delete_sheet');
    expect(annotations.destructiveHint).toBeUndefined();
    expect(annotations.readOnlyHint).toBeUndefined();
  });

  it('marks non-destructive writes explicitly', () => {
    expect(annotationsFor('sheets_update_values')).toEqual({
      destructiveHint: false,
      idempotentHint: true,
    });
  });

  it('omits idempotentHint for append', () => {
    expect(annotationsFor('sheets_append_values').idempotentHint).toBeUndefined();
    expect(annotationsFor('sheets_update_values').idempotentHint).toBe(true);
  });

  it('never emits a hint that just restates a spec default', () => {
    for (const name of REGISTERED_TOOL_NAMES) {
      const a = annotationsFor(name) as Record<string, unknown>;
      expect(a.readOnlyHint).not.toBe(false);
      expect(a.destructiveHint).not.toBe(true);
      expect(a.idempotentHint).not.toBe(false);
      expect(a).not.toHaveProperty('openWorldHint');
    }
  });
});
