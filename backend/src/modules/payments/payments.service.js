import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Payment from '../../models/Payment.js';
import Invoice from '../../models/Invoice.js';
import { scopedFilter } from '../../middleware/tenant.js';
import { publishBusinessEvent } from '../../services/businessEvents.js';
import { invalidateShopMetrics } from '../../services/metricsCache.js';

const syncInvoice = async (req, order) => {
  const paidAmount = Math.min(order.totalAmount, Math.max(0, Number(order.payment?.paidAmount) || 0));
  await Invoice.updateMany(
    scopedFilter(req, { orderId: order._id, status: { $ne: 'VOID' } }),
    { $set: { paidAmount, status: paidAmount >= order.totalAmount ? 'PAID' : 'ISSUED' } }
  );
};

const paymentId = () => new mongoose.Types.ObjectId();
const receiptNumber = (id) => `RCT-${id.toString().toUpperCase()}`;
const roundAmount = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

const paymentStatusExpression = (paidAmount, totalAmount) => ({
  $cond: [
    { $gte: [paidAmount, totalAmount] },
    'paid',
    { $cond: [{ $gt: [paidAmount, 0] }, 'partial', 'pending'] },
  ],
});

const findScopedOrder = (req, orderId) => {
  if (!mongoose.isValidObjectId(orderId)) return null;
  return Order.findOne(scopedFilter(req, { _id: orderId }));
};

export const listPayments = async (req, filters) => {
  const query = scopedFilter(req);
  for (const field of ['orderId', 'customerId', 'type', 'status']) {
    if (filters[field]) query[field] = filters[field];
  }
  const total = await Payment.countDocuments(query);
  const payments = await Payment.find(query)
    .populate('orderId', 'orderNumber totalAmount')
    .populate('customerId', 'name firstName lastName phone')
    .populate('createdBy', 'name firstName lastName')
    .sort({ createdAt: -1, _id: -1 })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit)
    .lean();
  return {
    payments,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
};

export const getPayment = (req, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Payment.findOne(scopedFilter(req, { _id: id }))
    .populate('orderId', 'orderNumber totalAmount payment')
    .populate('customerId', 'name firstName lastName phone email')
    .populate('originalPaymentId')
    .lean();
};

const validatePaymentAmountAgainstOrder = (amount, order) => {
  if (order.status === 'cancelled') {
    const error = new Error('Payments cannot be added to a cancelled order');
    error.status = 409;
    throw error;
  }
  const paid = roundAmount(order.payment?.paidAmount || 0);
  const balance = roundAmount(order.totalAmount - paid);
  if (amount > balance) {
    const error = new Error(`Payment exceeds the remaining balance of ${balance.toFixed(2)}`);
    error.status = 409;
    throw error;
  }
};

export const createPayment = async (req, input) => {
  const order = await findScopedOrder(req, input.orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.status = 404;
    throw error;
  }
  validatePaymentAmountAgainstOrder(input.amount, order);

  const amount = roundAmount(input.amount);
  const id = paymentId();
  const now = new Date();
  const updatedOrder = await Order.findOneAndUpdate(
    scopedFilter(req, {
      _id: order._id,
      status: { $ne: 'cancelled' },
      $expr: {
        $lte: [
          { $round: [{ $add: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }, 2] },
          '$totalAmount',
        ],
      },
    }),
    [{
      $set: {
        'payment.paidAmount': { $round: [{ $add: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }, 2] },
        'payment.method': input.method,
        'payment.status': paymentStatusExpression(
          { $round: [{ $add: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }, 2] },
          '$totalAmount'
        ),
        updatedAt: now,
      },
    }],
    { new: true }
  );
  if (!updatedOrder) {
    const error = new Error('Order balance changed; refresh and try again');
    error.status = 409;
    throw error;
  }

  let payment;
  try {
    payment = await Payment.create({
      _id: id,
      shopId: req.tenantId,
      receiptNumber: receiptNumber(id),
      orderId: order._id,
      customerId: order.customer,
      type: 'PAYMENT',
      amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
      paidAt: input.paidAt || now,
      createdBy: req.user.userId,
    });
  } catch (error) {
    await Order.updateOne(
      scopedFilter(req, { _id: order._id }),
      [{ $set: {
        'payment.paidAmount': { $round: [{ $max: [0, { $subtract: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }] }, 2] },
        'payment.status': paymentStatusExpression(
          { $round: [{ $max: [0, { $subtract: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }] }, 2] },
          '$totalAmount'
        ),
        updatedAt: new Date(),
      } }]
    );
    throw error;
  }
  await syncInvoice(req, updatedOrder);
  await publishBusinessEvent({
    shopId: req.tenantId, type: 'payment.recorded', title: 'Payment recorded',
    message: `${payment.receiptNumber} recorded for ${amount.toFixed(2)}.`,
    resourceType: 'payment', resourceId: payment._id,
  });
  await invalidateShopMetrics(req.tenantId);
  return payment;
};

export const updatePayment = async (req, id, changes) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Payment.findOneAndUpdate(
    scopedFilter(req, { _id: id, type: 'PAYMENT', status: 'POSTED' }),
    { $set: changes },
    { new: true, runValidators: true }
  ).lean();
};

export const createRefund = async (req, id, input) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const payment = await Payment.findOne(scopedFilter(req, { _id: id, type: 'PAYMENT', status: 'POSTED' }));
  if (!payment) return null;

  const amount = roundAmount(input.amount);
  const now = new Date();
  const reserveRefund = await Payment.updateOne(
    scopedFilter(req, {
      _id: payment._id,
      type: 'PAYMENT',
      status: 'POSTED',
      $expr: {
        $lte: [{ $round: [{ $add: [{ $ifNull: ['$refundedAmount', 0] }, amount] }, 2] }, '$amount'],
      },
    }),
    [{ $set: { refundedAmount: { $round: [{ $add: [{ $ifNull: ['$refundedAmount', 0] }, amount] }, 2] } } }]
  );
  if (!reserveRefund.modifiedCount) {
    const error = new Error('Refund exceeds the unrefunded payment amount');
    error.status = 409;
    throw error;
  }

  const updatedOrder = await Order.updateOne(
    scopedFilter(req, {
      _id: payment.orderId,
      $expr: { $gte: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] },
    }),
    [{
      $set: {
        'payment.paidAmount': { $round: [{ $subtract: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }, 2] },
        'payment.status': paymentStatusExpression(
          { $round: [{ $subtract: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }, 2] },
          '$totalAmount'
        ),
        updatedAt: new Date(),
      },
    }]
  );
  if (!updatedOrder.modifiedCount) {
    await Payment.updateOne(scopedFilter(req, { _id: payment._id }), [{
      $set: { refundedAmount: { $round: [{ $subtract: [{ $ifNull: ['$refundedAmount', 0] }, amount] }, 2] } },
    }]);
    const error = new Error('Order balance changed; refresh and try again');
    error.status = 409;
    throw error;
  }

  const refundId = paymentId();
  let refund;
  try {
    refund = await Payment.create({
      _id: refundId,
      shopId: req.tenantId,
      receiptNumber: receiptNumber(refundId),
      orderId: payment.orderId,
      customerId: payment.customerId,
      type: 'REFUND',
      amount,
      method: input.method || payment.method,
      reference: input.reference,
      notes: input.notes,
      originalPaymentId: payment._id,
      paidAt: input.paidAt || now,
      createdBy: req.user.userId,
    });
  } catch (error) {
    await Order.updateOne(scopedFilter(req, { _id: payment.orderId }), [{
      $set: {
        'payment.paidAmount': { $round: [{ $add: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }, 2] },
        'payment.status': paymentStatusExpression(
          { $round: [{ $add: [{ $ifNull: ['$payment.paidAmount', 0] }, amount] }, 2] },
          '$totalAmount'
        ),
        updatedAt: new Date(),
      },
    }]);
    await Payment.updateOne(scopedFilter(req, { _id: payment._id }), [{
      $set: { refundedAmount: { $round: [{ $subtract: [{ $ifNull: ['$refundedAmount', 0] }, amount] }, 2] } },
    }]);
    throw error;
  }
  const refreshedOrder = await Order.findOne(scopedFilter(req, { _id: payment.orderId }));
  if (refreshedOrder) await syncInvoice(req, refreshedOrder);
  await publishBusinessEvent({
    shopId: req.tenantId, type: 'payment.refunded', title: 'Payment refunded',
    message: `${refund.receiptNumber} refunded ${amount.toFixed(2)}.`,
    resourceType: 'payment', resourceId: refund._id,
  });
  await invalidateShopMetrics(req.tenantId);
  return refund;
};

export const voidPayment = async (req, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const payment = await Payment.findOneAndUpdate(
    scopedFilter(req, { _id: id, type: 'PAYMENT', status: 'POSTED', refundedAmount: 0 }),
    { $set: { status: 'VOID' } },
    { new: true }
  );
  if (!payment) return null;

  const order = await Order.findOneAndUpdate(
    scopedFilter(req, {
      _id: payment.orderId,
      $expr: { $gte: [{ $ifNull: ['$payment.paidAmount', 0] }, payment.amount] },
    }),
    [{
      $set: {
        'payment.paidAmount': { $round: [{ $subtract: [{ $ifNull: ['$payment.paidAmount', 0] }, payment.amount] }, 2] },
        'payment.status': paymentStatusExpression(
          { $round: [{ $subtract: [{ $ifNull: ['$payment.paidAmount', 0] }, payment.amount] }, 2] },
          '$totalAmount'
        ),
        updatedAt: new Date(),
      },
    }],
    { new: true }
  );
  if (!order) {
    await Payment.updateOne(scopedFilter(req, { _id: payment._id, status: 'VOID' }), { $set: { status: 'POSTED' } });
    const error = new Error('Unable to void payment because the order balance changed');
    error.status = 409;
    throw error;
  }

  await syncInvoice(req, order);
  await publishBusinessEvent({
    shopId: req.tenantId, type: 'payment.voided', title: 'Payment voided',
    message: `${payment.receiptNumber} was voided.`,
    resourceType: 'payment', resourceId: payment._id,
  });
  await invalidateShopMetrics(req.tenantId);
  return payment;
};
