import * as paymentService from './payments.service.js';
import {
  createPaymentSchema,
  createRefundSchema,
  listPaymentsSchema,
  updatePaymentSchema,
} from './payments.validation.js';

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request',
      message: issue.message,
    }));
    throw error;
  }
  return result.data;
};

export const listPayments = async (req, res, next) => {
  try {
    const result = await paymentService.listPayments(req, parse(listPaymentsSchema, req.query));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.getPayment(req, req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found', errors: [] });
    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createPayment(req, parse(createPaymentSchema, req.body));
    res.status(201).json({ success: true, message: 'Payment recorded', payment });
  } catch (error) {
    next(error);
  }
};

export const updatePayment = async (req, res, next) => {
  try {
    const payment = await paymentService.updatePayment(
      req,
      req.params.id,
      parse(updatePaymentSchema, req.body)
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Posted payment not found', errors: [] });
    res.json({ success: true, message: 'Payment details updated', payment });
  } catch (error) {
    next(error);
  }
};

export const refundPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.createRefund(
      req,
      req.params.id,
      parse(createRefundSchema, req.body)
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Posted payment not found', errors: [] });
    res.status(201).json({ success: true, message: 'Refund recorded', payment });
  } catch (error) {
    next(error);
  }
};

export const voidPayment = async (req, res, next) => {
  try {
    const payment = await paymentService.voidPayment(req, req.params.id);
    if (!payment) {
      return res.status(409).json({
        success: false,
        message: 'Payment not found, already voided, or has refunds',
        errors: [],
      });
    }
    res.json({ success: true, message: 'Payment voided', payment });
  } catch (error) {
    next(error);
  }
};
