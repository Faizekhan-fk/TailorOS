import { z } from 'zod';

const fieldSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9_]*$/, 'Key must use lowercase letters, numbers, and underscores'),
  label: z.string().trim().min(1).max(80),
  type: z.enum(['number', 'text', 'select', 'boolean']),
  unit: z.string().trim().max(20).optional().or(z.literal('')),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
});

const templateShape = {
  name: z.string().trim().min(2).max(100),
  fields: z.array(fieldSchema).min(1).max(100),
};

const validateFields = (value, context) => {
  const keys = value.fields.map((field) => field.key);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['fields'], message: 'Measurement keys must be unique' });
  }
  value.fields.forEach((field, index) => {
    if (field.type === 'select' && field.options.length === 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['fields', index, 'options'], message: 'Select fields require options' });
    }
  });
};

export const createTemplateSchema = z.object(templateShape).superRefine(validateFields);

export const updateTemplateSchema = z.object({
  name: templateShape.name.optional(),
  fields: templateShape.fields.optional(),
}).superRefine((value, context) => {
  if (value.fields) validateFields(value, context);
});

export const validationErrors = (error) =>
  error.issues.map((issue) => ({ field: issue.path.join('.') || 'request', message: issue.message }));
