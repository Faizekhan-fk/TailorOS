import MeasurementProfile from '../../models/MeasurementProfile.js';
import { scopedFilter } from '../../middleware/tenant.js';

export const validateMeasurementValues = (template, values) => {
  const allowedKeys = new Set(template.fields.map((field) => field.key));
  const unknownKeys = Object.keys(values).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length) return `Unknown measurement fields: ${unknownKeys.join(', ')}`;

  for (const field of template.fields) {
    const value = values[field.key];
    if (field.required && (value === undefined || value === null || value === '')) return `${field.label} is required`;
    if (value === undefined || value === null || value === '') continue;
    if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) return `${field.label} must be a number`;
    if (field.type === 'text' && typeof value !== 'string') return `${field.label} must be text`;
    if (field.type === 'boolean' && typeof value !== 'boolean') return `${field.label} must be true or false`;
    if (field.type === 'select' && !field.options.includes(String(value))) return `${field.label} has an invalid option`;
  }
  return null;
};

export const createMeasurementProfile = async ({ req, customer, template, values, notes }) => {
  const latest = await MeasurementProfile.findOne(
    scopedFilter(req, { customerId: customer._id })
  ).sort({ version: -1 });
  const version = (latest?.version || 0) + 1;

  const profile = await MeasurementProfile.create({
    shopId: req.tenantId,
    customerId: customer._id,
    templateId: template._id,
    version,
    values,
    notes,
    isCurrent: true,
    createdBy: req.user.userId,
  });

  await MeasurementProfile.updateMany(
    scopedFilter(req, { customerId: customer._id, _id: { $ne: profile._id } }),
    { $set: { isCurrent: false } }
  );

  customer.currentMeasurementProfileId = profile._id;
  customer.measurementTemplateId = template._id;
  customer.measurements = values;
  await customer.save();
  return profile;
};

export const listMeasurementProfiles = (req, customerId) => MeasurementProfile.find(
  scopedFilter(req, { customerId })
).populate('templateId', 'name fields').sort({ version: -1 });

export const getMeasurementProfile = (req, customerId, profileId) => MeasurementProfile.findOne(
  scopedFilter(req, { _id: profileId, customerId })
).populate('templateId', 'name fields');
