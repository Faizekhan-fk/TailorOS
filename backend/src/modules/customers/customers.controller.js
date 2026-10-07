import MeasurementTemplate from '../../models/MeasurementTemplate.js';
import { scopedFilter } from '../../middleware/tenant.js';
import { createCustomerSchema, listCustomersSchema, updateCustomerSchema } from './customers.validation.js';
import * as customerService from './customer.service.js';
import {
  createMeasurementProfile,
  getMeasurementProfile,
  listMeasurementProfiles,
  validateMeasurementValues,
} from '../measurements/measurement.service.js';

const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = result.error.issues.map((issue) => ({ field: issue.path.join('.') || 'request', message: issue.message }));
    throw error;
  }
  return result.data;
};

const nameParts = (input) => {
  const fullName = input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    name: fullName,
    firstName: input.firstName || parts[0],
    lastName: input.lastName || parts.slice(1).join(' ') || parts[0],
  };
};

export const createCustomer = async (req, res, next) => {
  try {
    const input = parse(createCustomerSchema, req.body);
    const names = nameParts(input);
    const customer = await customerService.createCustomer(req, {
      ...input,
      ...names,
      email: input.email || undefined,
      whatsapp: input.whatsapp || undefined,
      status: input.status || 'ACTIVE',
    });

    res.status(201).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const filters = parse(listCustomersSchema, req.query);
    const result = await customerService.listCustomers(req, filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomer(req, req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const input = parse(updateCustomerSchema, req.body);
    const changes = { ...input };
    if (changes.email === '') changes.email = undefined;
    if (changes.whatsapp === '') changes.whatsapp = undefined;

    const customer = await customerService.updateCustomer(req, req.params.id, changes);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer updated', customer });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerMeasurements = async (req, res, next) => {
  try {
    const { templateId, values } = req.body;
    if (!templateId || !values || typeof values !== 'object' || Array.isArray(values)) {
      return res.status(400).json({ success: false, message: 'templateId and values are required', errors: [] });
    }
    const template = await MeasurementTemplate.findOne(scopedFilter(req, { _id: templateId, isActive: true }));
    if (!template) return res.status(404).json({ success: false, message: 'Measurement template not found', errors: [] });
    const validationError = validateMeasurementValues(template, values);
    if (validationError) return res.status(400).json({ success: false, message: validationError, errors: [] });

    const customer = await customerService.getCustomerDocument(req, req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found', errors: [] });
    const profile = await createMeasurementProfile({ req, customer, template, values, notes: req.body.notes });
    return res.status(201).json({ success: true, message: `Measurement profile v${profile.version} created`, data: { profile, customer } });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerMeasurements = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerDocument(req, req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found', errors: [] });
    const profiles = await listMeasurementProfiles(req, customer._id);
    return res.json({ success: true, message: 'Measurement profiles loaded', data: { profiles } });
  } catch (error) {
    return next(error);
  }
};

export const getCustomerMeasurement = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerDocument(req, req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found', errors: [] });
    const profile = await getMeasurementProfile(req, req.params.id, req.params.profileId);
    if (!profile) return res.status(404).json({ success: false, message: 'Measurement profile not found', errors: [] });
    return res.json({ success: true, message: 'Measurement profile loaded', data: { profile } });
  } catch (error) {
    return next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.softDeleteCustomer(req, req.params.id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deactivated' });
  } catch (error) {
    next(error);
  }
};
