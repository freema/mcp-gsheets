import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { AddConditionalFormattingInput, ToolResponse } from '../types/tools.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';

// Schema definitions
const colorSchema = z.object({
  red: z.number().min(0).max(1).optional(),
  green: z.number().min(0).max(1).optional(),
  blue: z.number().min(0).max(1).optional(),
  alpha: z.number().min(0).max(1).optional(),
});

const textFormatSchema = z.object({
  foregroundColor: colorSchema.optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  underline: z.boolean().optional(),
});

const numberFormatSchema = z.object({
  type: z.enum([
    'TEXT',
    'NUMBER',
    'PERCENT',
    'CURRENCY',
    'DATE',
    'TIME',
    'DATE_TIME',
    'SCIENTIFIC',
  ]),
  pattern: z.string().optional(),
});

const cellFormatSchema = z.object({
  backgroundColor: colorSchema.optional(),
  textFormat: textFormatSchema.optional(),
  horizontalAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional(),
  verticalAlignment: z.enum(['TOP', 'MIDDLE', 'BOTTOM']).optional(),
  wrapStrategy: z.enum(['OVERFLOW_CELL', 'LEGACY_WRAP', 'CLIP', 'WRAP']).optional(),
  numberFormat: numberFormatSchema.optional(),
  padding: z
    .object({
      top: z.number().optional(),
      right: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
    })
    .optional(),
});

const conditionValueSchema = z.object({
  userEnteredValue: z.string().optional(),
  relativeDate: z.string().optional(),
});

const booleanConditionSchema = z.object({
  type: z.enum([
    'NUMBER_GREATER',
    'NUMBER_GREATER_THAN_EQ',
    'NUMBER_LESS',
    'NUMBER_LESS_THAN_EQ',
    'NUMBER_EQ',
    'NUMBER_NOT_EQ',
    'NUMBER_BETWEEN',
    'NUMBER_NOT_BETWEEN',
    'TEXT_CONTAINS',
    'TEXT_NOT_CONTAINS',
    'TEXT_STARTS_WITH',
    'TEXT_ENDS_WITH',
    'TEXT_EQ',
    'BLANK',
    'NOT_BLANK',
    'CUSTOM_FORMULA',
  ]),
  values: z.array(conditionValueSchema).optional(),
});

const gradientPointSchema = z.object({
  color: colorSchema,
  type: z.enum(['MIN', 'MAX', 'NUMBER', 'PERCENT', 'PERCENTILE']),
  value: z.string().optional(),
});

const booleanRuleSchema = z.object({
  condition: booleanConditionSchema,
  format: cellFormatSchema,
});

const gradientRuleSchema = z.object({
  minpoint: gradientPointSchema,
  maxpoint: gradientPointSchema,
  midpoint: gradientPointSchema.optional(),
});

const conditionalFormatRuleSchema = z.object({
  ranges: z.array(z.string()),
  booleanRule: booleanRuleSchema.optional(),
  gradientRule: gradientRuleSchema.optional(),
});

const addConditionalFormattingInputSchema = z.object({
  spreadsheetId: z.string(),
  rules: z.array(conditionalFormatRuleSchema),
});

export const addConditionalFormattingTool: Tool = {
  name: 'sheets_add_conditional_formatting',
  description: 'Add conditional formatting rules to a Google Sheet',
  inputSchema: {
    type: 'object',
    properties: addConditionalFormattingInputSchema.shape,
    required: ['spreadsheetId', 'rules'],
  },
};

export async function addConditionalFormattingHandler(input: any): Promise<ToolResponse> {
  try {
    // Handle case where rules comes as JSON string or rules array contains JSON strings
    if (input && typeof input.rules === 'string') {
      try {
        input.rules = JSON.parse(input.rules);
      } catch (parseError) {
        throw new Error('Invalid rules: Expected array or valid JSON string');
      }
    }

    const validatedInput = addConditionalFormattingInputSchema.parse(
      input
    ) as AddConditionalFormattingInput;
    const sheets = await getAuthenticatedClient();

    // Process all rules
    const requests: sheets_v4.Schema$Request[] = [];

    for (const rule of validatedInput.rules) {
      // Process ranges for this rule
      const gridRanges: sheets_v4.Schema$GridRange[] = [];

      for (const range of rule.ranges) {
        const { sheetName, range: cleanRange } = extractSheetName(range);
        const sheetId = await getSheetId(sheets, validatedInput.spreadsheetId, sheetName);
        gridRanges.push(parseRange(cleanRange, sheetId));
      }

      // Build the conditional format rule
      const conditionalFormatRule: sheets_v4.Schema$ConditionalFormatRule = {
        ranges: gridRanges,
      };

      if (rule.booleanRule) {
        const format: sheets_v4.Schema$CellFormat = {};
        if (rule.booleanRule.format.backgroundColor) {
          format.backgroundColor = rule.booleanRule.format.backgroundColor;
        }
        if (rule.booleanRule.format.textFormat) {
          format.textFormat = rule.booleanRule.format.textFormat;
        }
        if (rule.booleanRule.format.horizontalAlignment) {
          format.horizontalAlignment = rule.booleanRule.format.horizontalAlignment;
        }
        if (rule.booleanRule.format.verticalAlignment) {
          format.verticalAlignment = rule.booleanRule.format.verticalAlignment;
        }
        if (rule.booleanRule.format.wrapStrategy) {
          format.wrapStrategy = rule.booleanRule.format.wrapStrategy;
        }
        if (rule.booleanRule.format.numberFormat) {
          format.numberFormat = rule.booleanRule.format.numberFormat;
        }
        if (rule.booleanRule.format.padding) {
          format.padding = rule.booleanRule.format.padding;
        }

        const condition: any = {
          type: rule.booleanRule.condition.type,
        };
        if (rule.booleanRule.condition.values !== undefined) {
          condition.values = rule.booleanRule.condition.values;
        }
        conditionalFormatRule.booleanRule = {
          condition,
          format,
        };
      } else if (rule.gradientRule) {
        const gradientRule: any = {
          minpoint: {
            color: rule.gradientRule.minpoint.color,
            type: rule.gradientRule.minpoint.type,
          },
          maxpoint: {
            color: rule.gradientRule.maxpoint.color,
            type: rule.gradientRule.maxpoint.type,
          },
        };

        if (rule.gradientRule.minpoint.value !== undefined) {
          gradientRule.minpoint.value = rule.gradientRule.minpoint.value;
        }
        if (rule.gradientRule.maxpoint.value !== undefined) {
          gradientRule.maxpoint.value = rule.gradientRule.maxpoint.value;
        }

        if (rule.gradientRule.midpoint) {
          gradientRule.midpoint = {
            color: rule.gradientRule.midpoint.color,
            type: rule.gradientRule.midpoint.type,
          };
          if (rule.gradientRule.midpoint.value !== undefined) {
            gradientRule.midpoint.value = rule.gradientRule.midpoint.value;
          }
        }

        conditionalFormatRule.gradientRule = gradientRule;
      }

      requests.push({
        addConditionalFormatRule: {
          rule: conditionalFormatRule,
        },
      });
    }

    // Execute all conditional formatting requests
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: validatedInput.spreadsheetId,
      requestBody: {
        requests,
      },
    });

    return formatToolResponse(
      `Successfully added ${validatedInput.rules.length} conditional formatting rule(s)`,
      {
        spreadsheetId: response.data.spreadsheetId,
        rulesAdded: validatedInput.rules.length,
      }
    );
  } catch (error) {
    return handleError(error);
  }
}
