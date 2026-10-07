import mongoose from 'mongoose';
import Customer from '../../models/Customer.js';
import CustomerCounter from './customerCounter.model.js';
import { scopedFilter } from '../../middleware/tenant.js';

const CUSTOMER_NUMBER_ATTEMPTS = 10;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isDuplicateCustomerNumber = (error) => (
  error?.code === 11000
  && (error?.keyPattern?.customerNumber || error?.message?.includes('shopId_1_customerNumber_1'))
);

const nextCustomerNumber = async (shopId) => {
  try {
    const counter = await CustomerCounter.findOneAndUpdate(
      { shopId },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return `CUS-${String(counter.sequence).padStart(6, '0')}`;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const counter = await CustomerCounter.findOneAndUpdate(
      { shopId },
      { $inc: { sequence: 1 } },
      { new: true, upsert: false }
    );
    if (!counter) throw error;
    return `CUS-${String(counter.sequence).padStart(6, '0')}`;
  }
};

const activeCustomerFilter = (req, filter = {}) => scopedFilter(req, {
  ...filter,
  deletedAt: null,
});

export const createCustomer = async (req, input) => {
  let lastCollision;
  for (let attempt = 0; attempt < CUSTOMER_NUMBER_ATTEMPTS; attempt += 1) {
    const customer = new Customer({
      ...input,
      shopId: req.tenantId,
      customerNumber: await nextCustomerNumber(req.tenantId),
      createdBy: req.user.userId,
    });

    try {
      return await customer.save();
    } catch (error) {
      if (!isDuplicateCustomerNumber(error)) throw error;
      lastCollision = error;
    }
  }
  if (lastCollision) {
    lastCollision.status = 409;
    lastCollision.message = 'Unable to allocate a unique customer number';
  }
  throw lastCollision;
};

export const listCustomers = async (req, filters) => {
  const {
    page,
    limit,
    search,
    status,
    gender,
    tag,
    sortBy,
    sortOrder,
  } = filters;
  const conditions = [{ deletedAt: null }];
  if (status) conditions.push({ status });
  if (gender) conditions.push({ gender });
  if (tag) conditions.push({ tags: tag });
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    conditions.push({
      $or: ['customerNumber', 'name', 'firstName', 'lastName', 'phone', 'whatsapp', 'email']
        .map((field) => ({ [field]: expression })),
    });
  }

  const query = scopedFilter(req, { $and: conditions });
  const total = await Customer.countDocuments(query);
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: direction, _id: direction };
  const customers = await Customer.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getCustomer = (req, customerId) => {
  if (!mongoose.isValidObjectId(customerId)) return null;
  return Customer.findOne(activeCustomerFilter(req, { _id: customerId })).lean();
};

export const getCustomerDocument = (req, customerId) => {
  if (!mongoose.isValidObjectId(customerId)) return null;
  return Customer.findOne(activeCustomerFilter(req, { _id: customerId }));
};

export const updateCustomer = async (req, customerId, changes) => {
  if (!mongoose.isValidObjectId(customerId)) return null;
  const current = await Customer.findOne(activeCustomerFilter(req, { _id: customerId }));
  if (!current) return null;

  const update = { ...changes };
  if (update.name) {
    const nameParts = update.name.split(/\s+/);
    update.firstName = update.firstName || nameParts[0];
    update.lastName = update.lastName || nameParts.slice(1).join(' ') || nameParts[0];
  } else if (update.firstName || update.lastName) {
    update.firstName = update.firstName || current.firstName;
    update.lastName = update.lastName || current.lastName;
    update.name = `${update.firstName} ${update.lastName}`.trim();
  }

  const fieldsToUnset = Object.keys(update)
    .filter((field) => update[field] === undefined);
  const set = Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined)
  );
  const updateOperation = { $set: { ...set, updatedBy: req.user.userId } };
  if (fieldsToUnset.length) {
    updateOperation.$unset = Object.fromEntries(fieldsToUnset.map((field) => [field, 1]));
  }

  return Customer.findOneAndUpdate(
    activeCustomerFilter(req, { _id: customerId }),
    updateOperation,
    { new: true, runValidators: true }
  ).lean();
};

export const softDeleteCustomer = async (req, customerId) => {
  if (!mongoose.isValidObjectId(customerId)) return null;
  return Customer.findOneAndUpdate(
    activeCustomerFilter(req, { _id: customerId }),
    { $set: { deletedAt: new Date(), status: 'INACTIVE', updatedBy: req.user.userId } },
    { new: true, runValidators: true }
  ).lean();
};
