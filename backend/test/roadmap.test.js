import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import AuditLog from '../src/models/AuditLog.js';
import Customer from '../src/models/Customer.js';
import CustomerPortalAccount from '../src/models/CustomerPortalAccount.js';
import Expense from '../src/models/Expense.js';
import Garment from '../src/models/Garment.js';
import Inventory from '../src/models/Inventory.js';
import Invoice from '../src/models/Invoice.js';
import Notification from '../src/models/Notification.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import ProductionJob from '../src/models/ProductionJob.js';
import Purchase from '../src/models/Purchase.js';
import Shop from '../src/models/Shop.js';
import Supplier from '../src/models/Supplier.js';
import User from '../src/models/User.js';
import WhatsAppMessage from '../src/models/WhatsAppMessage.js';
import { config } from '../src/config/env.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { closeBusinessEventQueue } from '../src/services/businessEvents.js';
import { startQueueWorkers, closeQueueWorkers } from '../src/services/queueWorker.js';
import { startWhatsAppWorker, closeWhatsAppWorker } from '../src/services/whatsappWorker.js';
import { closeWhatsAppQueue } from '../src/services/whatsapp.js';

const server = http.createServer(app);
const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const emailA = `roadmap-a-${suffix}@example.com`;
const emailB = `roadmap-b-${suffix}@example.com`;
const shopIds = [];
let baseUrl;
let ownerA;
let ownerB;
let customerId;
let inventoryId;
let orderId;
let invoiceId;
const originalFetch = globalThis.fetch;
const appSecret = 'test-whatsapp-app-secret';

const call = async (path, token, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = response.headers.get('content-type')?.includes('image/')
    ? await response.text()
    : await response.json();
  return { response, body };
};

const register = async (email, name) => {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: 'Password123!' }),
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  shopIds.push(body.data.user.shopId);
  return body.data;
};

before(async () => {
  Object.assign(config, {
    WHATSAPP_ACCESS_TOKEN: 'test-access-token',
    WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
    WHATSAPP_APP_SECRET: appSecret,
    WHATSAPP_VERIFY_TOKEN: 'test-verification-token',
    WHATSAPP_ORDER_UPDATE_TEMPLATE: 'tailoros_order_update',
    WHATSAPP_TEMPLATE_LANGUAGE: 'en',
  });
  globalThis.fetch = async (input, options) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('https://graph.facebook.com/')) {
      assert.equal(options.headers.Authorization, 'Bearer test-access-token');
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.test-message-id' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(input, options);
  };
  await mongoose.connect(config.MONGODB_URI);
  await connectRedis();
  startQueueWorkers();
  startWhatsAppWorker();
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await closeQueueWorkers();
  await closeBusinessEventQueue();
  await closeWhatsAppWorker();
  await closeWhatsAppQueue();
  await CustomerPortalAccount.deleteMany({ shopId: { $in: shopIds } });
  await Expense.deleteMany({ shopId: { $in: shopIds } });
  await Invoice.deleteMany({ shopId: { $in: shopIds } });
  await Notification.deleteMany({ shopId: { $in: shopIds } });
  await WhatsAppMessage.deleteMany({ shopId: { $in: shopIds } });
  await Payment.deleteMany({ shopId: { $in: shopIds } });
  await ProductionJob.deleteMany({ shopId: { $in: shopIds } });
  await Purchase.deleteMany({ shopId: { $in: shopIds } });
  await Order.deleteMany({ shopId: { $in: shopIds } });
  await Inventory.deleteMany({ shopId: { $in: shopIds } });
  await Supplier.deleteMany({ shopId: { $in: shopIds } });
  await Customer.deleteMany({ shopId: { $in: shopIds } });
  await AuditLog.collection.deleteMany({ shopId: { $in: shopIds.map((id) => new mongoose.Types.ObjectId(id)) } });
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await Shop.deleteMany({ _id: { $in: shopIds } });
  await disconnectRedis();
  await mongoose.disconnect();
  globalThis.fetch = originalFetch;
});

test('procurement, expenses, invoices, Redis reports, queued notifications, audit and customer portal are shop-scoped', async () => {
  ownerA = await register(emailA, 'Roadmap Owner A');
  ownerB = await register(emailB, 'Roadmap Owner B');

  const supplier = await call('/suppliers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Roadmap Fabrics', phone: `555-${suffix.slice(-4)}` }),
  });
  assert.equal(supplier.response.status, 201);

  const inventory = await call('/inventory', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: `Roadmap fabric ${suffix}`, category: 'fabric', quantity: 4, unit: 'meter', unitPrice: 2.5 }),
  });
  assert.equal(inventory.response.status, 201);
  inventoryId = inventory.body.item._id;

  const qr = await call(`/barcodes/inventory/${inventoryId}`, ownerA.accessToken);
  assert.equal(qr.response.status, 200);
  assert.match(qr.body, /<svg/);
  const code = qr.response.headers.get('X-Barcode-Value');
  assert.ok(code);
  assert.equal((await call('/barcodes/resolve', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })).response.status, 200);
  assert.equal((await call('/barcodes/resolve', ownerB.accessToken, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })).response.status, 404);
  const barcode = await call(`/barcodes/inventory/${inventoryId}?format=barcode`, ownerA.accessToken);
  assert.equal(barcode.response.status, 200);
  assert.match(barcode.body, /<svg/);

  const purchase = await call('/purchases', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      supplierId: supplier.body.supplier._id,
      items: [{ inventoryId, quantity: 3, unitPrice: 2.5 }],
    }),
  });
  assert.equal(purchase.response.status, 201);
  assert.equal(purchase.body.purchase.totalAmount, 7.5);
  const received = await call(`/purchases/${purchase.body.purchase._id}/receive`, ownerA.accessToken, { method: 'POST' });
  assert.equal(received.response.status, 200);
  assert.equal(received.body.purchase.status, 'RECEIVED');
  const stockAfterReceipt = await call(`/inventory/${inventoryId}`, ownerA.accessToken);
  assert.equal(stockAfterReceipt.body.item.quantity, 7);
  assert.equal((await call(`/purchases/${purchase.body.purchase._id}/receive`, ownerA.accessToken, { method: 'POST' })).response.status, 409);

  const expense = await call('/expenses', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      category: 'utilities',
      description: 'Workshop power bill',
      amount: 32.45,
      paymentMethod: 'bank_transfer',
      spentAt: new Date().toISOString(),
    }),
  });
  assert.equal(expense.response.status, 201);
  assert.equal((await call('/expenses', ownerA.accessToken)).body.expenses.length, 1);

  const customer = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Portal Customer', email: `portal-${suffix}@example.com`, phone: `1555${suffix.replace(/\D/g, '').slice(-7)}` }),
  });
  assert.equal(customer.response.status, 201);
  customerId = customer.body.customer._id;
  assert.equal((await call(`/whatsapp/customers/${customerId}/consent`, ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ optedIn: true, source: 'Signed consent form' }),
  })).response.status, 200);
  const whatsappStatus = await call('/whatsapp/status', ownerA.accessToken);
  assert.equal(whatsappStatus.response.status, 200);
  assert.equal(whatsappStatus.body.configured, true);
  assert.equal((await call('/whatsapp/messages', ownerA.accessToken)).response.status, 200);
  assert.equal((await call(`/whatsapp/customers/${customerId}/consent`, ownerB.accessToken, {
    method: 'POST',
    body: JSON.stringify({ optedIn: true, source: 'Cross-shop attempt' }),
  })).response.status, 404);

  const order = await call('/orders', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ customerId, items: [{ quantity: 1, price: 50, notes: 'Custom fit' }], totalAmount: 50 }),
  });
  assert.equal(order.response.status, 201);
  orderId = order.body.order._id;
  const queuedWhatsApp = await call('/whatsapp/messages', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ customerId, orderId, parameters: [order.body.order.orderNumber] }),
  });
  assert.equal(queuedWhatsApp.response.status, 202);
  let deliveries;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    deliveries = (await call('/whatsapp/messages', ownerA.accessToken)).body.messages;
    if (deliveries.some((message) => message.status === 'SENT')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const sentMessage = deliveries.find((message) => message.status === 'SENT');
  assert.ok(sentMessage, 'BullMQ worker sends the approved template through the provider adapter');
  assert.match(sentMessage.recipientMasked, /^\*{4}\d{4}$/);
  assert.equal(sentMessage.providerMessageId, 'wamid.test-message-id');
  const webhookBody = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ changes: [{ field: 'messages', value: { statuses: [{
      id: sentMessage.providerMessageId,
      status: 'delivered',
      timestamp: String(Math.floor(Date.now() / 1000)),
    }] } }] }],
  });
  const webhookSignature = `sha256=${crypto.createHmac('sha256', appSecret).update(webhookBody).digest('hex')}`;
  const webhookResponse = await fetch(`${baseUrl}/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': webhookSignature },
    body: webhookBody,
  });
  assert.equal(webhookResponse.status, 200);
  deliveries = (await call('/whatsapp/messages', ownerA.accessToken)).body.messages;
  assert.equal(deliveries.find((message) => String(message._id) === String(sentMessage._id)).status, 'DELIVERED');
  const badSignature = await fetch(`${baseUrl}/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=invalid' },
    body: webhookBody,
  });
  assert.equal(badSignature.status, 401);
  const challengeResponse = await fetch(`${baseUrl}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test-verification-token&hub.challenge=tailoros-challenge`);
  assert.equal(challengeResponse.status, 200);
  assert.equal(await challengeResponse.text(), 'tailoros-challenge');
  assert.equal((await fetch(`${baseUrl}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`)).status, 403);
  assert.equal((await call(`/whatsapp/customers/${customerId}/consent`, ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ optedIn: false, source: 'Customer requested stop' }),
  })).response.status, 200);
  assert.equal((await call('/whatsapp/messages', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ customerId, orderId }),
  })).response.status, 409);

  const invoice = await call('/invoices', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
  assert.equal(invoice.response.status, 201);
  invoiceId = invoice.body.invoice._id;
  assert.equal(invoice.body.invoice.status, 'ISSUED');

  const account = await call('/customer-portal/accounts', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ customerId, password: 'CustomerPortal#2026' }),
  });
  assert.equal(account.response.status, 201);
  const portalLogin = await call('/customer-portal/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ shopId: ownerA.user.shopId, email: customer.body.customer.email, password: 'CustomerPortal#2026' }),
  });
  assert.equal(portalLogin.response.status, 200);
  const portalToken = portalLogin.body.accessToken;
  const portalOrders = await call('/customer-portal/me/orders', portalToken);
  assert.equal(portalOrders.response.status, 200);
  assert.equal(portalOrders.body.orders.length, 1);
  const portalInvoices = await call('/customer-portal/me/invoices', portalToken);
  assert.equal(portalInvoices.response.status, 200);
  assert.equal(portalInvoices.body.invoices[0]._id, invoiceId);
  assert.equal((await call('/customer-portal/me/orders')).response.status, 401);
  assert.equal((await call(`/invoices/${invoiceId}`, ownerB.accessToken)).response.status, 404);

  const payment = await call('/payments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ orderId, amount: 50, method: 'cash' }),
  });
  assert.equal(payment.response.status, 201);
  const paidInvoice = await call(`/invoices/${invoiceId}`, ownerA.accessToken);
  assert.equal(paidInvoice.body.invoice.paidAmount, 50);
  assert.equal(paidInvoice.body.invoice.status, 'PAID');

  const periodStart = new Date(Date.now() - 86400000).toISOString();
  const periodEnd = new Date(Date.now() + 86400000).toISOString();
  const financial = await call(`/reports/financial?from=${encodeURIComponent(periodStart)}&to=${encodeURIComponent(periodEnd)}`, ownerA.accessToken);
  assert.equal(financial.response.status, 200);
  assert.equal(financial.body.report.payments.total, 50);
  assert.equal(financial.body.report.expenses[0].total, 32.45);
  assert.equal(financial.body.report.purchases.total, 7.5);
  const analytics = await call('/analytics/overview', ownerA.accessToken);
  assert.equal(analytics.response.status, 200);
  assert.equal(analytics.body.analytics.paid, 50);

  let notifications;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await call('/notifications', ownerA.accessToken);
    notifications = response.body.notifications;
    if (notifications?.length >= 5) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(notifications.length >= 5, 'BullMQ worker persists the generated business notifications');
  const unread = notifications.find((notification) => !notification.readAt);
  assert.ok(unread);
  assert.equal((await call(`/notifications/${unread._id}/read`, ownerA.accessToken, { method: 'PATCH' })).response.status, 200);
  const marked = await call('/notifications', ownerA.accessToken);
  assert.ok(marked.body.notifications.find((notification) => notification._id === unread._id).readAt);

  await new Promise((resolve) => setTimeout(resolve, 100));
  const audit = await call('/audit-logs?limit=100', ownerA.accessToken);
  assert.equal(audit.response.status, 200);
  assert.ok(audit.body.logs.some((log) => log.resource === 'purchases'));
  assert.ok(audit.body.logs.some((log) => log.resource === 'customer-portal'));
  await assert.rejects(() => AuditLog.updateOne({ _id: audit.body.logs[0]._id }, { $set: { action: 'tampered' } }), /immutable/);

  await User.updateOne({ email: emailB }, { $set: { role: 'TAILOR' } });
  assert.equal((await call('/purchases', ownerB.accessToken, { method: 'POST', body: JSON.stringify({}) })).response.status, 403);
  assert.equal((await call('/reports/financial', ownerB.accessToken)).response.status, 403);
});
