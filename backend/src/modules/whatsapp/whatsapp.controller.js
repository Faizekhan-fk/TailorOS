import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { scopedFilter } from '../../middleware/tenant.js';
import Customer from '../../models/Customer.js';
import Order from '../../models/Order.js';
import WhatsAppMessage from '../../models/WhatsAppMessage.js';
import { enqueueWhatsAppMessage, isWhatsAppConfigured, verifyWhatsAppSignature } from '../../services/whatsapp.js';
import { emitShopEvent } from '../../services/realtime.js';

const invalid = (res, message) => res.status(400).json({ success: false, message, errors: [] });
const maskNumber = (value) => `****${String(value).replace(/[^\d]/g, '').slice(-4)}`;

export const getStatus = (req, res) => res.json({
  success: true,
  configured: isWhatsAppConfigured(),
  template: config.WHATSAPP_ORDER_UPDATE_TEMPLATE || null,
  language: config.WHATSAPP_TEMPLATE_LANGUAGE,
  provider: 'meta-cloud-api',
});

export const listMessages = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const filter = scopedFilter(req);
    const [messages, total] = await Promise.all([
      WhatsAppMessage.find(filter).populate('customerId', 'customerNumber name firstName lastName')
        .populate('createdBy', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WhatsAppMessage.countDocuments(filter),
    ]);
    res.json({ success: true, messages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

const consentSchema = z.object({
  optedIn: z.boolean(),
  source: z.string().trim().min(3).max(120),
}).strict();

export const setConsent = async (req, res, next) => {
  try {
    const input = consentSchema.safeParse(req.body);
    if (!input.success) return invalid(res, 'Provide optedIn and a consent source');
    if (!mongoose.isValidObjectId(req.params.customerId)) return res.status(404).json({ success: false, message: 'Customer not found', errors: [] });
    const customer = await Customer.findOneAndUpdate(
      scopedFilter(req, { _id: req.params.customerId, deletedAt: null }),
      {
        $set: {
          whatsappOptIn: input.data.optedIn,
          whatsappOptInAt: input.data.optedIn ? new Date() : null,
          whatsappOptInSource: input.data.optedIn ? input.data.source : null,
        },
      },
      { new: true, runValidators: true, projection: 'customerNumber name firstName lastName whatsapp phone whatsappOptIn whatsappOptInAt whatsappOptInSource' }
    );
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found', errors: [] });
    res.json({ success: true, customer });
  } catch (error) { next(error); }
};

const sendSchema = z.object({
  customerId: z.string().regex(/^[a-f\d]{24}$/i),
  orderId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  parameters: z.array(z.string().trim().min(1).max(256)).max(10).default([]),
}).strict();

export const sendOrderUpdate = async (req, res, next) => {
  try {
    const input = sendSchema.safeParse(req.body);
    if (!input.success) return invalid(res, 'Invalid WhatsApp message request');
    const customer = await Customer.findOne(scopedFilter(req, { _id: input.data.customerId, deletedAt: null }))
      .select('whatsapp phone whatsappOptIn');
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found', errors: [] });
    if (!customer.whatsappOptIn) return res.status(409).json({ success: false, message: 'Customer has not opted in to WhatsApp messages', errors: [] });
    const phone = String(customer.whatsapp || customer.phone || '').replace(/[^\d]/g, '');
    if (phone.length < 8 || phone.length > 15) return invalid(res, 'Customer phone must use international digits');
    if (input.data.orderId && !(await Order.exists(scopedFilter(req, { _id: input.data.orderId, customer: customer._id })))) {
      return res.status(404).json({ success: false, message: 'Order not found for this customer', errors: [] });
    }
    if (!isWhatsAppConfigured()) {
      const error = new Error('WhatsApp Cloud API is not configured');
      error.status = 503;
      throw error;
    }
    const message = await WhatsAppMessage.create({
      shopId: req.tenantId,
      customerId: customer._id,
      orderId: input.data.orderId || null,
      createdBy: req.user.userId,
      templateName: config.WHATSAPP_ORDER_UPDATE_TEMPLATE,
      recipientMasked: maskNumber(phone),
    });
    try {
      await enqueueWhatsAppMessage({
        shopId: String(req.tenantId),
        customerId: String(customer._id),
        orderId: input.data.orderId || null,
        messageId: String(message._id),
        parameters: input.data.parameters,
      });
    } catch (error) {
      message.status = 'FAILED';
      message.failureCode = error.status === 503 ? 'QUEUE_OR_PROVIDER_UNAVAILABLE' : 'QUEUE_FAILED';
      message.statusUpdatedAt = new Date();
      await message.save();
      throw error;
    }
    res.status(202).json({ success: true, message: 'WhatsApp template queued', delivery: message });
  } catch (error) { next(error); }
};

export const verifyWebhook = (req, res) => {
  const tokenBytes = Buffer.from(String(req.query['hub.verify_token'] || ''));
  const expectedBytes = Buffer.from(config.WHATSAPP_VERIFY_TOKEN);
  const validToken = expectedBytes.length > 0 && tokenBytes.length === expectedBytes.length
    && crypto.timingSafeEqual(tokenBytes, expectedBytes);
  if (req.query['hub.mode'] === 'subscribe' && validToken && typeof req.query['hub.challenge'] === 'string') {
    return res.status(200).type('text/plain').send(req.query['hub.challenge']);
  }
  return res.status(403).json({ success: false, message: 'Webhook verification failed' });
};

const statusMap = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' };

export const receiveWebhook = async (req, res) => {
  if (!verifyWhatsAppSignature(req.rawBody, req.get('X-Hub-Signature-256'))) {
    return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
  }
  if (req.body?.object !== 'whatsapp_business_account') return invalid(res, 'Unsupported webhook payload');
  const updates = [];
  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      for (const status of change.value?.statuses || []) {
        const mapped = statusMap[status.status];
        if (!mapped || !status.id) continue;
        updates.push(WhatsAppMessage.findOneAndUpdate(
          { providerMessageId: status.id },
          {
            $set: {
              status: mapped,
              failureCode: mapped === 'FAILED' ? String(status.errors?.[0]?.code || 'PROVIDER_DELIVERY_FAILED').slice(0, 80) : null,
              statusUpdatedAt: new Date(Number(status.timestamp) * 1000 || Date.now()),
            },
          },
          { new: true }
        ).then((message) => {
          if (message) emitShopEvent(message.shopId, 'whatsapp:status', { messageId: String(message._id), status: message.status });
        }));
      }
    }
  }
  await Promise.all(updates);
  return res.sendStatus(200);
};
