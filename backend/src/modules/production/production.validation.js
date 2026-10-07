import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const activeStage = z.enum(['queued', 'cutting', 'sewing', 'fitting', 'finishing', 'quality_check', 'ready', 'blocked']);

export const listProductionJobsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  stage: z.enum(['queued', 'cutting', 'sewing', 'fitting', 'finishing', 'quality_check', 'ready', 'blocked', 'cancelled']).optional(),
  orderId: objectId.optional(),
  assignedTailor: objectId.optional(),
  search: z.string().trim().max(100).optional(),
}).strict();

export const updateProductionStageSchema = z.object({
  stage: activeStage,
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const assignProductionJobSchema = z.object({
  tailorId: objectId.nullable(),
}).strict();
