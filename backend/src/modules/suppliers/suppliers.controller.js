import Supplier from '../../models/Supplier.js';
import { scopedFilter } from '../../middleware/tenant.js';

export const createSupplier = async (req, res, next) => {
  try {
    const { name, email, phone, address, paymentTerms, rating, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const supplier = new Supplier({ shopId: req.tenantId, name, email, phone, address, paymentTerms, rating, notes });
    await supplier.save();
    res.status(201).json({ success: true, supplier });
  } catch (error) {
    next(error);
  }
};

export const getSuppliers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    let query = scopedFilter(req);
    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    }

    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });

    res.json({ success: true, suppliers, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ success: true, supplier });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const { name, email, phone, address, paymentTerms, rating, isActive, notes } = req.body;
    const changes = Object.fromEntries(
      Object.entries({ name, email, phone, address, paymentTerms, rating, isActive, notes })
        .filter(([, value]) => value !== undefined)
    );
    const supplier = await Supplier.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      changes,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier updated', supplier });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findOneAndDelete(scopedFilter(req, { _id: req.params.id }));
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    next(error);
  }
};
