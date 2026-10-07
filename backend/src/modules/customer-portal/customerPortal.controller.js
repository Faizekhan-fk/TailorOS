import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { z } from 'zod';
import { config } from '../../config/env.js';
import Customer from '../../models/Customer.js';
import CustomerPortalAccount from '../../models/CustomerPortalAccount.js';
import Invoice from '../../models/Invoice.js';
import MeasurementProfile from '../../models/MeasurementProfile.js';
import Order from '../../models/Order.js';
import Shop from '../../models/Shop.js';
import { scopedFilter } from '../../middleware/tenant.js';

const loginSchema = z.object({
  shopId: z.string().regex(/^[a-f\d]{24}$/i),
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

export const portalLogin = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
    const { shopId, email, password } = parsed.data;
    const account = await CustomerPortalAccount.findOne({
      shopId, email, status: 'ACTIVE',
    }).select('+passwordHash');
    if (!account || !(await account.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid shop, email, or password', errors: [] });
    }
    const customer = await Customer.findOne({ _id: account.customerId, shopId, status: 'ACTIVE', deletedAt: null });
    const shop = await Shop.findOne({ _id: shopId, status: 'ACTIVE' }).select('name');
    if (!customer || !shop) return res.status(401).json({ success: false, message: 'Portal account is inactive', errors: [] });
    account.lastLoginAt = new Date();
    await account.save();
    const accessToken = jwt.sign({
      portalAccountId: String(account._id),
      tokenType: 'customer-portal',
      jti: crypto.randomUUID(),
    }, config.JWT_SECRET, { expiresIn: '30m', audience: 'customer-portal' });
    return res.json({
      success: true,
      accessToken,
      customer: { id: String(customer._id), name: customer.name, email: customer.email, shopName: shop.name },
    });
  } catch (error) { next(error); }
};

export const requirePortal = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ success: false, message: 'Customer portal authentication required', errors: [] });
    const payload = jwt.verify(token, config.JWT_SECRET, { audience: 'customer-portal' });
    if (payload.tokenType !== 'customer-portal' || !mongoose.isValidObjectId(payload.portalAccountId)) {
      return res.status(401).json({ success: false, message: 'Invalid customer portal token', errors: [] });
    }
    const account = await CustomerPortalAccount.findOne({
      _id: payload.portalAccountId,
      status: 'ACTIVE',
    }).select('shopId customerId email');
    if (!account) return res.status(401).json({ success: false, message: 'Customer portal account is inactive', errors: [] });
    const customer = await Customer.findOne({
      _id: account.customerId, shopId: account.shopId, status: 'ACTIVE', deletedAt: null,
    });
    if (!customer) return res.status(401).json({ success: false, message: 'Customer account is inactive', errors: [] });
    req.portal = { accountId: String(account._id), customerId: String(customer._id), shopId: String(account.shopId) };
    req.tenantId = String(account.shopId);
    req.user = { userId: String(account._id), role: 'CUSTOMER_PORTAL', shopId: String(account.shopId) };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired customer portal token', errors: [] });
    }
    return next(error);
  }
};

export const listPortalAccounts = async (req, res, next) => {
  try {
    const accounts = await CustomerPortalAccount.find(scopedFilter(req))
      .populate('customerId', 'name firstName lastName email phone status')
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, accounts });
  } catch (error) { next(error); }
};

const accountSchema = z.object({
  customerId: z.string().regex(/^[a-f\d]{24}$/i),
  password: z.string().min(12).max(128),
}).strict();

export const createPortalAccount = async (req, res, next) => {
  try {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
    const customer = await Customer.findOne(scopedFilter(req, {
      _id: parsed.data.customerId, status: 'ACTIVE', deletedAt: null,
    }));
    if (!customer?.email) return res.status(400).json({ success: false, message: 'An active customer with an email address is required', errors: [] });
    const account = await CustomerPortalAccount.create({
      shopId: req.tenantId,
      customerId: customer._id,
      email: customer.email,
      passwordHash: parsed.data.password,
    });
    res.status(201).json({
      success: true,
      account: { id: account._id, email: account.email, customerId: account.customerId, status: account.status },
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'A portal account already exists for this customer or email', errors: [] });
    next(error);
  }
};

export const updatePortalAccount = async (req, res, next) => {
  try {
    const statusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict();
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: parsed.error.issues });
    const account = await CustomerPortalAccount.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.id }),
      { $set: { status: parsed.data.status } },
      { new: true }
    ).select('_id email customerId status');
    if (!account) return res.status(404).json({ success: false, message: 'Portal account not found', errors: [] });
    res.json({ success: true, account });
  } catch (error) { next(error); }
};

export const getPortalProfile = async (req, res, next) => {
  try {
    const customer = await Customer.findOne(scopedFilter(req, { _id: req.portal.customerId }))
      .select('name firstName lastName email phone address measurements currentMeasurementProfileId');
    res.json({ success: true, customer });
  } catch (error) { next(error); }
};

export const getPortalOrders = async (req, res, next) => {
  try {
    const orders = await Order.find(scopedFilter(req, { customer: req.portal.customerId }))
      .populate('items.garment', 'name category')
      .sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, orders });
  } catch (error) { next(error); }
};

export const getPortalInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find(scopedFilter(req, { customerId: req.portal.customerId, status: { $ne: 'VOID' } }))
      .populate('orderId', 'orderNumber status deliveryDate')
      .sort({ issuedAt: -1 }).limit(100).lean();
    res.json({ success: true, invoices });
  } catch (error) { next(error); }
};

export const getPortalMeasurements = async (req, res, next) => {
  try {
    const profiles = await MeasurementProfile.find(scopedFilter(req, { customerId: req.portal.customerId }))
      .populate('templateId', 'name')
      .sort({ version: -1 }).limit(50).lean();
    res.json({ success: true, profiles });
  } catch (error) { next(error); }
};
