import mongoose from 'mongoose';
import Purchase from '../../models/Purchase.js';
import Inventory from '../../models/Inventory.js';
import Supplier from '../../models/Supplier.js';
import { scopedFilter } from '../../middleware/tenant.js';
import { z } from 'zod';
import { publishBusinessEvent } from '../../services/businessEvents.js';
import { invalidateShopMetrics } from '../../services/metricsCache.js';

const itemSchema = z.object({
  inventoryId: z.string().regex(/^[a-f\d]{24}$/i),
  quantity: z.number().positive().max(1_000_000),
  unitPrice: z.number().nonnegative().max(1_000_000_000),
}).strict();
const createSchema = z.object({
  supplierId: z.string().regex(/^[a-f\d]{24}$/i),
  items: z.array(itemSchema).min(1).max(100),
  notes: z.string().trim().max(2000).optional(),
}).strict();
const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message }));
    throw error;
  }
  return result.data;
};
const purchaseNumber = () => `PUR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export const listPurchases = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const query = scopedFilter(req);
    if (req.query.status) query.status = req.query.status;
    const [purchases, total] = await Promise.all([
      Purchase.find(query).populate('supplier', 'name phone email')
        .sort({ orderedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Purchase.countDocuments(query),
    ]);
    res.json({ success: true, purchases, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const getPurchase = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Purchase not found', errors: [] });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Purchase not found', errors: [] });
    const purchase = await Purchase.findOne(scopedFilter(req, { _id: req.params.id }))
      .populate('supplier').populate('items.inventoryId').lean();
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found', errors: [] });
    res.json({ success: true, purchase });
  } catch (error) { next(error); }
};

export const createPurchase = async (req, res, next) => {
  try {
    const input = parse(createSchema, req.body);
    const supplier = await Supplier.findOne(scopedFilter(req, { _id: input.supplierId, isActive: true })).select('_id');
    if (!supplier) return res.status(400).json({ success: false, message: 'Active supplier not found in this shop', errors: [] });
    const ids = [...new Set(input.items.map((item) => item.inventoryId))];
    const inventory = await Inventory.find(scopedFilter(req, { _id: { $in: ids } })).select('name unit');
    if (inventory.length !== ids.length) return res.status(400).json({ success: false, message: 'One or more inventory items do not belong to this shop', errors: [] });
    const byId = new Map(inventory.map((item) => [String(item._id), item]));
    const items = input.items.map((item) => ({
      inventoryId: item.inventoryId,
      name: byId.get(item.inventoryId).name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
    const totalAmount = Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100) / 100;
    const purchase = await Purchase.create({
      shopId: req.tenantId,
      purchaseNumber: purchaseNumber(),
      supplier: supplier._id,
      items,
      totalAmount,
      notes: input.notes,
      createdBy: req.user.userId,
    });
    await publishBusinessEvent({
      shopId: req.tenantId, type: 'purchase.created', title: 'Purchase order created',
      message: `${purchase.purchaseNumber} was created for ${totalAmount.toFixed(2)}.`,
      resourceType: 'purchase', resourceId: purchase._id,
    });
    res.status(201).json({ success: true, purchase });
  } catch (error) { next(error); }
};

export const receivePurchase = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Purchase not found', errors: [] });
    const purchase = await Purchase.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id, status: 'ORDERED' }),
      { $set: { status: 'RECEIVING', updatedBy: req.user.userId } },
      { new: true }
    );
    if (!purchase) return res.status(409).json({ success: false, message: 'Only an ordered purchase can be received', errors: [] });
    const inventory = await Inventory.find(scopedFilter(req, { _id: { $in: purchase.items.map((item) => item.inventoryId) } }));
    if (inventory.length !== new Set(purchase.items.map((item) => String(item.inventoryId))).size) {
      await Purchase.updateOne(scopedFilter(req, { _id: purchase._id, status: 'RECEIVING' }), { $set: { status: 'ORDERED' } });
      return res.status(409).json({ success: false, message: 'Purchase inventory is incomplete; no stock was changed', errors: [] });
    }
    const increments = [];
    try {
      for (const item of purchase.items) {
        const result = await Inventory.updateOne(
          scopedFilter(req, { _id: item.inventoryId }),
          { $inc: { quantity: item.quantity }, $set: { lastRestocked: new Date() } }
        );
        if (result.modifiedCount !== 1) throw new Error(`Unable to update inventory item ${item.inventoryId}`);
        increments.push(item);
      }
      purchase.items.forEach((item) => { item.receivedQuantity = item.quantity; });
      purchase.status = 'RECEIVED';
      purchase.receivedAt = new Date();
      purchase.updatedBy = req.user.userId;
      await purchase.save();
    } catch (error) {
      for (const item of increments.reverse()) {
        await Inventory.updateOne(scopedFilter(req, { _id: item.inventoryId }), { $inc: { quantity: -item.quantity } });
      }
      await Purchase.updateOne(scopedFilter(req, { _id: purchase._id, status: 'RECEIVING' }), { $set: { status: 'ORDERED' } });
      throw error;
    }
    await publishBusinessEvent({
      shopId: req.tenantId, type: 'purchase.received', title: 'Purchase received',
      message: `${purchase.purchaseNumber} has been received into inventory.`,
      resourceType: 'purchase', resourceId: purchase._id,
    });
    await invalidateShopMetrics(req.tenantId);
    res.json({ success: true, purchase });
  } catch (error) { next(error); }
};

export const cancelPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id, status: 'ORDERED' }),
      { $set: { status: 'CANCELLED', updatedBy: req.user.userId } },
      { new: true }
    );
    if (!purchase) return res.status(409).json({ success: false, message: 'Only an ordered purchase can be cancelled', errors: [] });
    res.json({ success: true, purchase });
  } catch (error) { next(error); }
};
