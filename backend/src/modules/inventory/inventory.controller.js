import Inventory from '../../models/Inventory.js';
import Supplier from '../../models/Supplier.js';
import { scopedFilter } from '../../middleware/tenant.js';

export const createInventoryItem = async (req, res, next) => {
  try {
    const { name, category, quantity, unit, reorderLevel, unitPrice, supplier, notes } = req.body;

    if (!name || !category || quantity === undefined || !unit || !unitPrice) {
      return res.status(400).json({ error: 'Name, category, quantity, unit, and price are required' });
    }

    if (supplier && !(await Supplier.exists(scopedFilter(req, { _id: supplier })))) {
      return res.status(400).json({ error: 'Supplier does not belong to this shop' });
    }

    const item = new Inventory({
      shopId: req.tenantId,
      name,
      category,
      quantity,
      unit,
      reorderLevel,
      unitPrice,
      supplier,
      notes,
      lastRestocked: new Date(),
    });

    await item.save();
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

export const getInventory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search, lowStock } = req.query;
    const skip = (page - 1) * limit;

    let query = scopedFilter(req);
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (lowStock === 'true') query.$expr = { $lte: ['$quantity', '$reorderLevel'] };

    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query)
      .populate('supplier', 'name phone email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      items,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryById = async (req, res, next) => {
  try {
    const item = await Inventory.findOne(scopedFilter(req, { _id: req.params.id })).populate('supplier');

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
};

export const updateInventory = async (req, res, next) => {
  try {
    const { name, category, quantity, unit, reorderLevel, unitPrice, supplier, notes } = req.body;

    if (supplier && !(await Supplier.exists(scopedFilter(req, { _id: supplier })))) {
      return res.status(400).json({ error: 'Supplier does not belong to this shop' });
    }

    const item = await Inventory.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      { name, category, quantity, unit, reorderLevel, unitPrice, supplier, notes, lastRestocked: new Date() },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ success: true, message: 'Inventory updated', item });
  } catch (error) {
    next(error);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    const item = await Inventory.findOne(scopedFilter(req, { _id: req.params.id }));
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    item.quantity = quantity;
    item.lastRestocked = new Date();
    await item.save();

    res.json({ success: true, message: 'Stock updated', item });
  } catch (error) {
    next(error);
  }
};

export const deleteInventoryItem = async (req, res, next) => {
  try {
    const item = await Inventory.findOneAndDelete(scopedFilter(req, { _id: req.params.id }));

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ success: true, message: 'Inventory item deleted' });
  } catch (error) {
    next(error);
  }
};
