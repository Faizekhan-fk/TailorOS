import MeasurementTemplate from '../../models/MeasurementTemplate.js';
import { scopedFilter } from '../../middleware/tenant.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  validationErrors,
} from './measurement.validation.js';

const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = validationErrors(result.error);
    throw error;
  }
  return result.data;
};

export const listTemplates = async (req, res, next) => {
  try {
    const templates = await MeasurementTemplate.find(scopedFilter(req, { isActive: true }))
      .sort({ name: 1 });
    return res.json({ success: true, message: 'Measurement templates loaded', data: { templates } });
  } catch (error) {
    return next(error);
  }
};

export const getTemplate = async (req, res, next) => {
  try {
    const template = await MeasurementTemplate.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!template) return res.status(404).json({ success: false, message: 'Measurement template not found', errors: [] });
    return res.json({ success: true, message: 'Measurement template loaded', data: { template } });
  } catch (error) {
    return next(error);
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    const template = await MeasurementTemplate.create({
      ...parse(createTemplateSchema, req.body),
      shopId: req.tenantId,
      createdBy: req.user.userId,
    });
    return res.status(201).json({ success: true, message: 'Measurement template created', data: { template } });
  } catch (error) {
    return next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const template = await MeasurementTemplate.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      parse(updateTemplateSchema, req.body),
      { new: true, runValidators: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Measurement template not found', errors: [] });
    return res.json({ success: true, message: 'Measurement template updated', data: { template } });
  } catch (error) {
    return next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await MeasurementTemplate.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      { isActive: false },
      { new: true }
    );
    if (!template) return res.status(404).json({ success: false, message: 'Measurement template not found', errors: [] });
    return res.json({ success: true, message: 'Measurement template archived', data: { template } });
  } catch (error) {
    return next(error);
  }
};
