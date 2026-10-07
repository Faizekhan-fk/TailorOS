import mongoose from 'mongoose';
import { z } from 'zod';
import Expense from '../../models/Expense.js';
import { scopedFilter } from '../../middleware/tenant.js';
import { publishBusinessEvent } from '../../services/businessEvents.js';
import { invalidateShopMetrics } from '../../services/metricsCache.js';

const schema = z.object({
  category: z.enum(['rent', 'utilities', 'payroll', 'supplies', 'maintenance', 'transport', 'marketing', 'other']),
  description: z.string().trim().min(2).max(300),
  amount: z.number().positive().max(1_000_000_000)
    .refine((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8, 'Amount supports up to 2 decimal places'),
  spentAt: z.coerce.date().optional(),
  paymentMethod: z.enum(['cash', 'card', 'online', 'check', 'bank_transfer', 'other']),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
}).strict();
const parse = (value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message }));
    throw error;
  }
  return result.data;
};
const number = () => `EXP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export const listExpenses = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const query = scopedFilter(req, { status: { $ne: 'VOID' } });
    if (req.query.category) query.category = req.query.category;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && Number.isNaN(from.valueOf())) || (to && Number.isNaN(to.valueOf()))) {
      return res.status(400).json({ success: false, message: 'Invalid date filter', errors: [] });
    }
    if (from || to) query.spentAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const [expenses, total] = await Promise.all([
      Expense.find(query).populate('createdBy', 'name email').sort({ spentAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Expense.countDocuments(query),
    ]);
    res.json({ success: true, expenses, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const createExpense = async (req, res, next) => {
  try {
    const input = parse(req.body);
    const expense = await Expense.create({
      ...input, shopId: req.tenantId, expenseNumber: number(), createdBy: req.user.userId,
    });
    await invalidateShopMetrics(req.tenantId);
    await publishBusinessEvent({
      shopId: req.tenantId, type: 'expense.created', title: 'Expense recorded',
      message: `${expense.description}: ${expense.amount.toFixed(2)}.`,
      resourceType: 'expense', resourceId: expense._id,
    });
    res.status(201).json({ success: true, expense });
  } catch (error) { next(error); }
};

export const updateExpense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Expense not found', errors: [] });
    const input = parse(req.body);
    const expense = await Expense.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id, status: 'POSTED' }),
      { $set: { ...input, updatedBy: req.user.userId } },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Posted expense not found', errors: [] });
    await invalidateShopMetrics(req.tenantId);
    res.json({ success: true, expense });
  } catch (error) { next(error); }
};

export const voidExpense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Expense not found', errors: [] });
    const expense = await Expense.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id, status: 'POSTED' }),
      { $set: { status: 'VOID', updatedBy: req.user.userId } },
      { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Posted expense not found', errors: [] });
    await invalidateShopMetrics(req.tenantId);
    res.json({ success: true, message: 'Expense voided and retained in the ledger', expense });
  } catch (error) { next(error); }
};
