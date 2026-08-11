import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

/**
 * Converts a Zod object schema into the JSON Schema that MCP `Tool.inputSchema` expects.
 *
 * Assigning a Zod schema's `.shape` directly to `inputSchema.properties` publishes Zod
 * internals instead of JSON Schema, so clients receive a tool definition they cannot
 * validate against JSON Schema draft 2020-12.
 *
 * @param schema - The Zod object schema describing the tool input
 * @returns The tool input as JSON Schema
 */
export function toInputSchema(schema: z.ZodObject<z.ZodRawShape>): Tool['inputSchema'] {
  const jsonSchema = z.toJSONSchema(schema, { io: 'input' });
  delete jsonSchema.$schema;
  return jsonSchema as Tool['inputSchema'];
}
