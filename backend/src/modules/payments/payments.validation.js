import { z } from 'zod';

const amountSchema = z.number()
  .finite()
  .positive()
  .max(1_000_000_000)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, 'Amount supports up to 2 decimal places');
const methodSchema = z.enum(['cash', 'card', 'online', 'check', 'bank_transfer', 'other']);

export const createPaymentSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid order ID'),
  amount: amountSchema,
  method: methodSchema,
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  paidAt: z.coerce.date().optional(),
}).strict();

export const createRefundSchema = z.object({
  amount: amountSchema,
  method: methodSchema.optional(),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  paidAt: z.coerce.date().optional(),
}).strict();

export const updatePaymentSchema = z.object({
  reference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const listPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  customerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  type: z.enum(['PAYMENT', 'REFUND']).optional(),
  status: z.enum(['POSTED', 'VOID']).optional(),
}).strict();
