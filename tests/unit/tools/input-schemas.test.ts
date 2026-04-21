import { describe, expect, it } from 'vitest';
import { appendValuesTool } from '../../../src/tools/append-values';
import { updateValuesTool } from '../../../src/tools/update-values';
import { batchUpdateValuesTool } from '../../../src/tools/batch-update-values';
import { insertRowsTool } from '../../../src/tools/insert-rows';
import { deleteColumnsTool } from '../../../src/tools/delete-columns';
import { deleteRowsTool } from '../../../src/tools/delete-rows';

describe('tool input schemas', () => {
  it('defines items for nested 2D values arrays', () => {
    expect(appendValuesTool.inputSchema.properties?.values).toMatchObject({
      type: 'array',
      items: {
        type: 'array',
        items: {},
      },
    });

    expect(updateValuesTool.inputSchema.properties?.values).toMatchObject({
      type: 'array',
      items: {
        type: 'array',
        items: {},
      },
    });

    expect(batchUpdateValuesTool.inputSchema.properties?.data).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          values: {
            type: 'array',
            items: {
              type: 'array',
              items: {},
            },
          },
        },
      },
    });

    expect(insertRowsTool.inputSchema.properties?.values).toMatchObject({
      type: 'array',
      items: {
        type: 'array',
        items: {},
      },
    });

    expect(deleteColumnsTool.inputSchema.properties?.range).toMatchObject({
      type: 'string',
    });

    expect(deleteRowsTool.inputSchema.properties?.range).toMatchObject({
      type: 'string',
    });
  });
});
