import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Payment from '../../models/Payment.js';
import Expense from '../../models/Expense.js';
import Purchase from '../../models/Purchase.js';
import ProductionJob from '../../models/ProductionJob.js';
import { readCache, writeCache } from '../../services/redisCache.js';

const dateRange = (req) => {
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(to.valueOf() - 29 * 86400000);
  if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || from > to || to - from > 366 * 86400000) {
    const error = new Error('Provide a valid date range of at most 366 days');
    error.status = 400;
    throw error;
  }
  return { from, to };
};

export const financialReport = async (req, res, next) => {
  try {
    const { from, to } = dateRange(req);
    const key = `report:financial:${req.tenantId}:${from.toISOString()}:${to.toISOString()}`;
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, report: cached, cached: true });
    const range = { $gte: from, $lte: to };
    const shopId = new mongoose.Types.ObjectId(req.tenantId);
    const [payments, refunds, expenses, purchases, orders] = await Promise.all([
      Payment.aggregate([
        { $match: { shopId, type: 'PAYMENT', status: 'POSTED', paidAt: range } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { shopId, type: 'REFUND', status: 'POSTED', paidAt: range } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { shopId, status: 'POSTED', spentAt: range } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Purchase.aggregate([
        { $match: { shopId, status: 'RECEIVED', receivedAt: range } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { shopId, createdAt: range, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
    ]);
    const report = {
      from, to,
      payments: payments[0] || { total: 0, count: 0 },
      refunds: refunds[0] || { total: 0, count: 0 },
      expenses,
      purchases: purchases[0] || { total: 0, count: 0 },
      orders: orders[0] || { total: 0, count: 0 },
    };
    await writeCache(key, report, 60);
    res.json({ success: true, report, cached: false });
  } catch (error) { next(error); }
};

export const productionReport = async (req, res, next) => {
  try {
    const key = `report:production:${req.tenantId}`;
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, report: cached, cached: true });
    const shopId = new mongoose.Types.ObjectId(req.tenantId);
    const [stages, overdue] = await Promise.all([
      ProductionJob.aggregate([
        { $match: { shopId } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ProductionJob.countDocuments({
        shopId,
        stage: { $nin: ['ready', 'cancelled'] },
        dueDate: { $lt: new Date() },
      }),
    ]);
    const report = { stages, overdue };
    await writeCache(key, report, 30);
    res.json({ success: true, report, cached: false });
  } catch (error) { next(error); }
};

export const dashboardAnalytics = async (req, res, next) => {
  try {
    const key = `analytics:overview:${req.tenantId}`;
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, analytics: cached, cached: true });
    const shopId = new mongoose.Types.ObjectId(req.tenantId);
    const [orders, paid, expenses, production, recent] = await Promise.all([
      Order.aggregate([{ $match: { shopId } }, { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }]),
      Payment.aggregate([{ $match: { shopId, type: 'PAYMENT', status: 'POSTED' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { shopId, status: 'POSTED', spentAt: { $gte: new Date(Date.now() - 30 * 86400000) } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      ProductionJob.aggregate([{ $match: { shopId, stage: { $nin: ['ready', 'cancelled'] } } }, { $group: { _id: '$stage', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { shopId, createdAt: { $gte: new Date(Date.now() - 29 * 86400000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, sales: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const analytics = { orders, paid: paid[0]?.total || 0, expenses30d: expenses[0]?.total || 0, openProduction: production, orderTrend30d: recent };
    await writeCache(key, analytics, 60);
    res.json({ success: true, analytics, cached: false });
  } catch (error) { next(error); }
};
