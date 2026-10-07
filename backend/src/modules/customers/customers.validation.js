import { z } from 'zod';

const gender = z.preprocess(
  (value) => typeof value === 'string' ? value.toLowerCase() : value,
  z.enum(['male', 'female', 'other', 'prefer_not_to_say'])
);

const address = z.object({
  street: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  zipCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(80).optional(),
}).strict().or(z.string().trim().max(500)).optional();

const common = {
  name: z.string().trim().min(2).max(120).optional(),
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  phone: z.string().trim().min(3).max(30).optional(),
  whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
  gender: gender.optional(),
  address,
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
};

export const createCustomerSchema = z.object({
  ...common,
  phone: common.phone.unwrap(),
}).strict().superRefine((value, context) => {
  if (!value.name && !(value.firstName && value.lastName)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Name is required' });
  }
});

export const updateCustomerSchema = z.object(common).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  'At least one customer field is required'
);

export const listCustomersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  gender: gender.optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  sortBy: z.enum(['createdAt', 'name', 'customerNumber', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();
