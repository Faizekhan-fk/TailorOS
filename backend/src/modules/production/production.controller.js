import Order from '../../models/Order.js';
import { scopedFilter } from '../../middleware/tenant.js';
import * as productionService from './production.service.js';
import {
  assignProductionJobSchema,
  listProductionJobsSchema,
  updateProductionStageSchema,
} from './production.validation.js';

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request',
      message: issue.message,
    }));
    throw error;
  }
  return result.data;
};

export const listProductionJobs = async (req, res, next) => {
  try {
    const result = await productionService.listProductionJobs(req, parse(listProductionJobsSchema, req.query));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getProductionJob = async (req, res, next) => {
  try {
    const job = await productionService.getProductionJob(req, req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Production job not found', errors: [] });
    res.json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

export const createOrderProductionJobs = async (req, res, next) => {
  try {
    const order = await Order.findOne(scopedFilter(req, { _id: req.params.orderId }));
    if (!order) return res.status(404).json({ success: false, message: 'Order not found', errors: [] });
    const jobs = await productionService.createJobsForOrder(req, order);
    res.status(201).json({ success: true, message: 'Production jobs are ready', jobs });
  } catch (error) {
    next(error);
  }
};

export const updateProductionStage = async (req, res, next) => {
  try {
    const job = await productionService.updateProductionStage(
      req,
      req.params.id,
      parse(updateProductionStageSchema, req.body)
    );
    if (!job) return res.status(404).json({ success: false, message: 'Production job not found', errors: [] });
    res.json({ success: true, message: 'Production stage updated', job });
  } catch (error) {
    next(error);
  }
};

export const assignProductionJob = async (req, res, next) => {
  try {
    const { tailorId } = parse(assignProductionJobSchema, req.body);
    const job = await productionService.assignProductionJob(req, req.params.id, tailorId);
    if (!job) return res.status(404).json({ success: false, message: 'Production job not found', errors: [] });
    res.json({ success: true, message: 'Production assignment updated', job });
  } catch (error) {
    next(error);
  }
};
