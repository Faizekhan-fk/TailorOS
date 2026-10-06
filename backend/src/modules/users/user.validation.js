import { z } from 'zod';
import { SYSTEM_ROLES } from '../../config/rolePermissions.js';

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8).max(128),
  role: z.enum(SYSTEM_ROLES).default('RECEPTIONIST'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(SYSTEM_ROLES),
});

export const validationErrors = (error) =>
  error.issues.map((issue) => ({ field: issue.path.join('.') || 'request', message: issue.message }));
