import mongoose from 'mongoose';
import { config } from '../config/env.js';
import Customer from '../models/Customer.js';
import Garment from '../models/Garment.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import Supplier from '../models/Supplier.js';
import Tailor from '../models/Tailor.js';
import User from '../models/User.js';

const backfillFromUser = async (Model, relationField) => {
  const records = await Model.find({ shopId: { $exists: false }, [relationField]: { $ne: null } })
    .select(`_id ${relationField}`)
    .lean();
  let updated = 0;
  for (const record of records) {
    const user = await User.findById(record[relationField]).select('shopId shop').lean();
    const shopId = user?.shopId || user?.shop;
    if (shopId) {
      await Model.updateOne({ _id: record._id }, { $set: { shopId } });
      updated += 1;
    }
  }
  return { updated, unresolved: records.length - updated };
};

const backfillFromSupplier = async () => {
  const records = await Inventory.find({ shopId: { $exists: false }, supplier: { $ne: null } })
    .select('_id supplier')
    .lean();
  let updated = 0;
  for (const record of records) {
    const supplier = await Supplier.findById(record.supplier).select('shopId').lean();
    if (supplier?.shopId) {
      await Inventory.updateOne({ _id: record._id }, { $set: { shopId: supplier.shopId } });
      updated += 1;
    }
  }
  return { updated, unresolved: records.length - updated };
};

const dropLegacyGarmentIndex = async () => {
  const indexes = await Garment.collection.indexes();
  const legacy = indexes.find((index) => index.name === 'name_1' && index.unique);
  if (legacy) await Garment.collection.dropIndex(legacy.name);
  return Boolean(legacy);
};

const backfillCustomerNumbers = async () => {
  const customers = await Customer.find({ customerNumber: { $exists: false } }).select('_id').lean();
  for (let index = 0; index < customers.length; index += 1) {
    await Customer.updateOne(
      { _id: customers[index]._id },
      { $set: { customerNumber: `CUS-MIGRATED-${Date.now()}-${index + 1}` } }
    );
  }
  return customers.length;
};

try {
  await mongoose.connect(config.MONGODB_URI);
  const results = {
    customers: await backfillFromUser(Customer, 'createdBy'),
    orders: await backfillFromUser(Order, 'createdBy'),
    tailors: await backfillFromUser(Tailor, 'user'),
    inventory: await backfillFromSupplier(),
    garmentLegacyIndexDropped: await dropLegacyGarmentIndex(),
    customerNumbersBackfilled: await backfillCustomerNumbers(),
  };
  const unresolved = await Promise.all([
    Customer.countDocuments({ shopId: { $exists: false } }),
    Garment.countDocuments({ shopId: { $exists: false } }),
    Inventory.countDocuments({ shopId: { $exists: false } }),
    Order.countDocuments({ shopId: { $exists: false } }),
    Supplier.countDocuments({ shopId: { $exists: false } }),
    Tailor.countDocuments({ shopId: { $exists: false } }),
  ]);
  console.log(JSON.stringify({ ...results, unresolvedRecords: unresolved.reduce((sum, count) => sum + count, 0) }, null, 2));
} finally {
  await mongoose.disconnect();
}
