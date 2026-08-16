import { describe, it, expect } from 'vitest';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as tools from '../../../src/tools/index.js';

/**
 * Tool definitions are published verbatim over `tools/list`, so an input schema that is
 * not valid JSON Schema is rejected by the client rather than by this server. Clients
 * reject the whole request, which takes every tool down at once, so these checks cover
 * all exported tools rather than a hand-picked sample.
 *
 * Each schema is serialized first, because that is what a client actually receives.
 */

const JSON_SCHEMA_TYPES = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];

// Keywords JSON Schema defines as a non-negative integer.
const INTEGER_KEYWORDS = [
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minProperties',
  'maxProperties',
];

// Keys that only appear when a Zod schema is published instead of being converted.
const ZOD_INTERNAL_KEYS = ['_def', 'def', '_zod', '~standard'];

const SCHEMA_FORMS = ['type', 'enum', 'const', 'anyOf', 'oneOf', 'allOf', '$ref'];

// Keywords whose value is itself a schema.
const SCHEMA_VALUED = ['items', 'contains', 'not', 'if', 'then', 'else', 'propertyNames'];
// Keywords holding a map of schemas.
const SCHEMA_MAPS = ['properties', 'patternProperties', '$defs', 'definitions'];
// Keywords holding a list of schemas.
const SCHEMA_LISTS = ['anyOf', 'oneOf', 'allOf', 'prefixItems'];

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toolEntries: [string, Tool][] = Object.values(tools)
  .filter(
    (value): value is Tool =>
      isObject(value) && typeof value.name === 'string' && isObject(value.inputSchema)
  )
  .map((tool) => [tool.name, tool]);

/** Visits every node that sits in a JSON Schema position, skipping property-name maps. */
function eachSchema(root: unknown, visit: (schema: JsonObject, path: string) => void) {
  const walk = (node: unknown, path: string) => {
    if (!isObject(node)) return;
    visit(node, path);

    for (const keyword of SCHEMA_VALUED) {
      if (keyword in node) walk(node[keyword], `${path}.${keyword}`);
    }
    for (const keyword of SCHEMA_MAPS) {
      const map = node[keyword];
      if (!isObject(map)) continue;
      for (const [key, child] of Object.entries(map)) walk(child, `${path}.${keyword}.${key}`);
    }
    for (const keyword of SCHEMA_LISTS) {
      const list = node[keyword];
      if (!Array.isArray(list)) continue;
      list.forEach((child, i) => walk(child, `${path}.${keyword}[${i}]`));
    }
    if (isObject(node.additionalProperties)) {
      walk(node.additionalProperties, `${path}.additionalProperties`);
    }
  };
  walk(root, 'inputSchema');
}

/** The schema exactly as a client receives it. */
const published = (tool: Tool): JsonObject => JSON.parse(JSON.stringify(tool.inputSchema));

describe('tool input schemas', () => {
  it('discovers the exported tools', () => {
    expect(toolEntries.length).toBeGreaterThan(0);
  });

  it.each(toolEntries)('%s declares an object schema', (_name, tool) => {
    expect(published(tool).type).toBe('object');
  });

  it.each(toolEntries)('%s publishes no Zod internals', (_name, tool) => {
    eachSchema(published(tool), (schema, path) => {
      for (const key of ZOD_INTERNAL_KEYS) {
        expect(
          key in schema,
          `${path} leaks the Zod internal key "${key}" — convert the schema with toInputSchema()`
        ).toBe(false);
      }
    });
  });

  it.each(toolEntries)('%s uses well-typed JSON Schema keywords', (_name, tool) => {
    eachSchema(published(tool), (schema, path) => {
      if ('type' in schema) {
        const declared = Array.isArray(schema.type) ? schema.type : [schema.type];
        for (const entry of declared) {
          expect(JSON_SCHEMA_TYPES, `${path}.type is ${JSON.stringify(entry)}`).toContain(entry);
        }
      }
      if ('enum' in schema) {
        expect(Array.isArray(schema.enum), `${path}.enum must be an array`).toBe(true);
      }
      if ('format' in schema) {
        expect(typeof schema.format, `${path}.format must be a string`).toBe('string');
      }
      for (const keyword of INTEGER_KEYWORDS) {
        if (keyword in schema) {
          expect(
            Number.isInteger(schema[keyword]),
            `${path}.${keyword} must be an integer, got ${JSON.stringify(schema[keyword])}`
          ).toBe(true);
        }
      }
    });
  });

  it.each(toolEntries)('%s gives every property a schema', (_name, tool) => {
    eachSchema(published(tool), (schema, path) => {
      if (!isObject(schema.properties)) return;
      for (const [property, child] of Object.entries(schema.properties)) {
        expect(isObject(child), `${path}.properties.${property} must be an object`).toBe(true);
        const keys = Object.keys(child as JsonObject);
        expect(
          keys.some((key) => SCHEMA_FORMS.includes(key)),
          `${path}.properties.${property} declares no JSON Schema form, only: ${keys.join(', ')}`
        ).toBe(true);
      }
    });
  });

  it.each(toolEntries)('%s only requires properties it declares', (_name, tool) => {
    eachSchema(published(tool), (schema, path) => {
      if (!Array.isArray(schema.required) || !isObject(schema.properties)) return;
      const declared = Object.keys(schema.properties);
      for (const required of schema.required) {
        expect(declared, `${path}.required lists "${String(required)}"`).toContain(required);
      }
    });
  });
});
