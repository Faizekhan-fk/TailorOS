import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('A valid email is required');
const password = z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email,
  password,
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  // Accepted only for old local clients; role is never accepted from the client.
  firstName: z.string().trim().max(50).optional(),
  lastName: z.string().trim().max(50).optional(),
}).superRefine((value, context) => {
  if (!value.name && !(value.firstName && value.lastName)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Name is required' });
  }
});

export const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required').max(128) });

export const refreshSchema = z.object({}).optional();

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
}).refine((value) => value.name || value.phone !== undefined, 'At least one profile field is required');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

export const formatValidationErrors = (error) =>
  error.issues.map((issue) => ({ field: issue.path.join('.') || 'request', message: issue.message }));
