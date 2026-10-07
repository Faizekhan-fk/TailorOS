import mongoose from 'mongoose';
import { z } from 'zod';
import Invoice from '../../models/Invoice.js';
import Order from '../../models/Order.js';
import Garment from '../../models/Garment.js';
import { scopedFilter } from '../../middleware/tenant.js';
import { publishBusinessEvent } from '../../services/businessEvents.js';

const issueSchema = z.object({
  orderId: z.string().regex(/^[a-f\d]{24}$/i),
  dueAt: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();
const invoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export const listInvoices = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const query = scopedFilter(req);
    if (req.query.status) query.status = req.query.status;
    const [invoices, total] = await Promise.all([
      Invoice.find(query).populate('orderId', 'orderNumber status')
        .populate('customerId', 'name firstName lastName email phone')
        .sort({ issuedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Invoice.countDocuments(query),
    ]);
    res.json({ success: true, invoices, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const getInvoice = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Invoice not found', errors: [] });
    const invoice = await Invoice.findOne(scopedFilter(req, { _id: req.params.id }))
      .populate('orderId', 'orderNumber status deliveryDate')
      .populate('customerId', 'name firstName lastName email phone address').lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found', errors: [] });
    res.json({ success: true, invoice });
  } catch (error) { next(error); }
};

export const issueInvoice = async (req, res, next) => {
  try {
    const parsed = issueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
    const order = await Order.findOne(scopedFilter(req, { _id: parsed.data.orderId }))
      .populate('items.garment', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found', errors: [] });
    if (order.status === 'cancelled') return res.status(409).json({ success: false, message: 'Cannot invoice a cancelled order', errors: [] });
    const items = await Promise.all(order.items.map(async (item) => {
      let name = item.garment?.name;
      if (!name && item.garment) name = (await Garment.findOne(scopedFilter(req, { _id: item.garment })))?.name;
      name ||= 'Custom garment';
      const quantity = item.quantity || 1;
      const unitPrice = item.price || 0;
      return { name, quantity, unitPrice, total: Math.round(quantity * unitPrice * 100) / 100 };
    }));
    const total = Math.round(Number(order.totalAmount) * 100) / 100;
    const paidAmount = Math.min(total, Math.max(0, Number(order.payment?.paidAmount) || 0));
    const invoice = await Invoice.create({
      shopId: req.tenantId,
      invoiceNumber: invoiceNumber(),
      orderId: order._id,
      customerId: order.customer,
      items,
      subtotal: total,
      total,
      paidAmount,
      status: paidAmount >= total ? 'PAID' : 'ISSUED',
      dueAt: parsed.data.dueAt || order.deliveryDate,
      notes: parsed.data.notes,
      createdBy: req.user.userId,
    });
    await publishBusinessEvent({
      shopId: req.tenantId, type: 'invoice.issued', title: 'Invoice issued',
      message: `${invoice.invoiceNumber} was issued for ${total.toFixed(2)}.`,
      resourceType: 'invoice', resourceId: invoice._id,
    });
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'An invoice already exists for this order', errors: [] });
    next(error);
  }
};

export const voidInvoice = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Invoice not found', errors: [] });
    const invoice = await Invoice.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id, status: { $ne: 'VOID' } }),
      { $set: { status: 'VOID' } },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Active invoice not found', errors: [] });
    res.json({ success: true, invoice });
  } catch (error) { next(error); }
};
