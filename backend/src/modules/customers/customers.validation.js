import { z } from 'zod';

const address = z.object({
  street: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  zipCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(80).optional(),
}).optional();

const common = {
  name: z.string().trim().min(2).max(120).optional(),
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  phone: z.string().trim().min(3).max(30).optional(),
  whatsapp: z.string().trim().max(30).optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  address,
  measurements: z.record(z.union([z.number(), z.string(), z.boolean()])).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
};

export const createCustomerSchema = z.object({
  ...common,
  phone: common.phone.unwrap(),
}).superRefine((value, context) => {
  if (!value.name && !(value.firstName && value.lastName)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Name is required' });
  }
});

export const updateCustomerSchema = z.object(common).partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one customer field is required'
);
