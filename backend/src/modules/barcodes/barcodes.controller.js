import crypto from 'node:crypto';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import { z } from 'zod';
import { config } from '../../config/env.js';
import { scopedFilter } from '../../middleware/tenant.js';
import Customer from '../../models/Customer.js';
import Inventory from '../../models/Inventory.js';
import Order from '../../models/Order.js';

const types = {
  customer: { model: Customer, projection: 'customerNumber name firstName lastName status' },
  order: { model: Order, projection: 'orderNumber status deliveryDate customer' },
  inventory: { model: Inventory, projection: 'name category quantity unit' },
};

const signature = (type, id, shopId) => crypto.createHmac('sha256', config.BARCODE_SIGNING_SECRET)
  .update(`${type}:${id}:${shopId}`).digest('hex').slice(0, 24);

const entityFor = async (req, type, id) => {
  const definition = types[type];
  if (!definition || !mongoose.isValidObjectId(id)) return null;
  const activeCustomerFilter = type === 'customer' ? { deletedAt: null } : {};
  return definition.model.findOne(scopedFilter(req, { _id: id, ...activeCustomerFilter })).select(definition.projection).lean();
};

const entityLabel = (type, entity) => type === 'customer'
  ? entity.customerNumber
  : type === 'order'
    ? entity.orderNumber
    : entity.name;

export const generateCode = async (req, res, next) => {
  try {
    const type = String(req.params.type).toLowerCase();
    if (!types[type]) return res.status(404).json({ success: false, message: 'Unsupported barcode resource', errors: [] });
    const entity = await entityFor(req, type, req.params.id);
    if (!entity) return res.status(404).json({ success: false, message: 'Record not found', errors: [] });
    const code = `${type}:${entity._id}:${signature(type, entity._id, req.tenantId)}`;
    const format = req.query.format === 'barcode' ? 'barcode' : 'qr';
    const svg = format === 'barcode'
      ? bwipjs.toSVG({ bcid: 'code128', text: code, scale: 2, height: 12, includetext: true, textxalign: 'center' })
      : await QRCode.toString(code, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 240 });
    res.type('image/svg+xml').set({
      'Cache-Control': 'private, no-store',
      'X-Barcode-Value': code,
    }).send(svg);
  } catch (error) { next(error); }
};

const resolveSchema = z.object({ code: z.string().trim().min(1).max(256) }).strict();

export const resolveCode = async (req, res, next) => {
  try {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: 'A barcode value is required', errors: [] });
    const match = /^([a-z]+):([a-f\d]{24}):([a-f\d]{24})$/i.exec(parsed.data.code);
    if (!match || !types[match[1].toLowerCase()]) return res.status(400).json({ success: false, message: 'Invalid barcode value', errors: [] });
    const [, rawType, id, receivedSignature] = match;
    const type = rawType.toLowerCase();
    const expected = Buffer.from(signature(type, id, req.tenantId));
    const received = Buffer.from(receivedSignature.toLowerCase());
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      return res.status(404).json({ success: false, message: 'Record not found for this shop', errors: [] });
    }
    const entity = await entityFor(req, type, id);
    if (!entity) return res.status(404).json({ success: false, message: 'Record not found for this shop', errors: [] });
    if (type === 'order' && entity.customer) {
      entity.customer = await Customer.findOne(scopedFilter(req, { _id: entity.customer }))
        .select('customerNumber name').lean() || null;
    }
    res.json({ success: true, record: { type, id: String(entity._id), label: entityLabel(type, entity), data: entity } });
  } catch (error) { next(error); }
};
