import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Customer from '../src/models/Customer.js';
import Garment from '../src/models/Garment.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import ProductionJob from '../src/models/ProductionJob.js';
import Tailor from '../src/models/Tailor.js';
import Shop from '../src/models/Shop.js';
import User from '../src/models/User.js';
import { config } from '../src/config/env.js';

const server = http.createServer(app);
const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const emailA = `commerce-a-${suffix}@example.com`;
const emailB = `commerce-b-${suffix}@example.com`;
const shopIds = [];
let baseUrl;
let ownerA;
let ownerB;
let customerId;
let garmentId;
let orderId;
let jobId;
let tailorId;

const call = async (path, token, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = ['Bearer', token].join(' ');
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { response, body: await response.json() };
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
  await mongoose.connect(config.MONGODB_URI);
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  await Payment.deleteMany({ shopId: { $in: shopIds } });
  await ProductionJob.deleteMany({ shopId: { $in: shopIds } });
  await Tailor.deleteMany({ shopId: { $in: shopIds } });
  await Order.deleteMany({ shopId: { $in: shopIds } });
  await Customer.deleteMany({ shopId: { $in: shopIds } });
  await Garment.deleteMany({ shopId: { $in: shopIds } });
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await Shop.deleteMany({ _id: { $in: shopIds } });
  await mongoose.disconnect();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('payment ledger and production workflow enforce role, tenant, balance, and state boundaries', async () => {
  ownerA = await register(emailA, 'Commerce Owner A');
  ownerB = await register(emailB, 'Commerce Owner B');

  assert.equal((await call('/payments')).response.status, 401);
  assert.equal((await call('/production')).response.status, 401);

  const customer = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Commerce Customer', phone: `555-${suffix.slice(-4)}` }),
  });
  assert.equal(customer.response.status, 201);
  customerId = customer.body.customer._id;

  const garment = await call('/garments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: `Commerce garment ${suffix}`, category: 'shirt', basePrice: 100 }),
  });
  assert.equal(garment.response.status, 201);
  garmentId = garment.body.garment._id;

  const order = await call('/orders', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      customerId,
      items: [{ garment: garmentId, quantity: 1, price: 100 }],
      totalAmount: 100,
      paymentMethod: 'cash',
    }),
  });
  assert.equal(order.response.status, 201);
  orderId = order.body.order._id;

  const createdJobs = await call('/production', ownerA.accessToken);
  assert.equal(createdJobs.response.status, 200);
  assert.equal(createdJobs.body.pagination.total, 1);
  jobId = createdJobs.body.jobs[0]._id;
  assert.equal(createdJobs.body.jobs[0].stage, 'queued');

  const invalidTransition = await call(`/production/${jobId}/stage`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'sewing' }),
  });
  assert.equal(invalidTransition.response.status, 409);
  const prematureDelivery = await call(`/orders/${orderId}`, ownerA.accessToken, {
    method: 'PUT',
    body: JSON.stringify({ status: 'delivered' }),
  });
  assert.equal(prematureDelivery.response.status, 409);
  const blocked = await call(`/production/${jobId}/stage`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'blocked' }),
  });
  assert.equal(blocked.response.status, 200);
  const invalidResume = await call(`/production/${jobId}/stage`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'sewing' }),
  });
  assert.equal(invalidResume.response.status, 409);
  const resumed = await call(`/production/${jobId}/stage`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'queued' }),
  });
  assert.equal(resumed.response.status, 200);

  const tailor = await call('/tailors', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ userId: ownerA.user.id, specialization: ['shirts'] }),
  });
  assert.equal(tailor.response.status, 201);
  tailorId = tailor.body.tailor._id;

  const assigned = await call(`/production/${jobId}/assignment`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ tailorId }),
  });
  assert.equal(assigned.response.status, 200);
  assert.equal(assigned.body.job.assignedTailor._id, tailorId);

  for (const stage of ['cutting', 'sewing', 'finishing', 'quality_check', 'ready']) {
    const changed = await call(`/production/${jobId}/stage`, ownerA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ stage }),
    });
    assert.equal(changed.response.status, 200, `${stage}: ${changed.body.message}`);
  }
  const readyOrder = await call(`/orders/${orderId}`, ownerA.accessToken);
  assert.equal(readyOrder.body.order.status, 'ready');

  const deliveredOrder = await call(`/orders/${orderId}`, ownerA.accessToken, {
    method: 'PUT',
    body: JSON.stringify({ status: 'delivered' }),
  });
  assert.equal(deliveredOrder.response.status, 200);
  assert.equal(deliveredOrder.body.order.status, 'delivered');
  const reopenDeliveredJob = await call(`/production/${jobId}/stage`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'finishing' }),
  });
  assert.equal(reopenDeliveredJob.response.status, 409);
  const cancelDeliveredOrder = await call(`/orders/${orderId}/cancel`, ownerA.accessToken, { method: 'PATCH' });
  assert.equal(cancelDeliveredOrder.response.status, 409);
  const unauthorizedStatusChange = await call(`/orders/${orderId}`, ownerA.accessToken, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' }),
  });
  assert.equal(unauthorizedStatusChange.response.status, 400);

  const payment = await call('/payments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ orderId, amount: 40, method: 'cash' }),
  });
  assert.equal(payment.response.status, 201);
  assert.match(payment.body.payment.receiptNumber, /^RCT-/);
  const excessive = await call('/payments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ orderId, amount: 60.01, method: 'cash' }),
  });
  assert.equal(excessive.response.status, 409);
  const remaining = await call('/payments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ orderId, amount: 60, method: 'bank_transfer' }),
  });
  assert.equal(remaining.response.status, 201);

  const refund = await call(`/payments/${payment.body.payment._id}/refunds`, ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ amount: 15 }),
  });
  assert.equal(refund.response.status, 201);
  assert.equal(refund.body.payment.type, 'REFUND');
  const excessiveRefund = await call(`/payments/${payment.body.payment._id}/refunds`, ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ amount: 26 }),
  });
  assert.equal(excessiveRefund.response.status, 409);

  const orderWithRefund = await call(`/orders/${orderId}`, ownerA.accessToken);
  assert.equal(orderWithRefund.body.order.payment.paidAmount, 85);
  assert.equal(orderWithRefund.body.order.payment.status, 'partial');

  const directPaymentChange = await call(`/orders/${orderId}`, ownerA.accessToken, {
    method: 'PUT',
    body: JSON.stringify({ payment: { paidAmount: 0, status: 'pending' } }),
  });
  assert.equal(directPaymentChange.response.status, 400);
  const protectedOrderDelete = await call(`/orders/${orderId}`, ownerA.accessToken, { method: 'DELETE' });
  assert.equal(protectedOrderDelete.response.status, 409);

  const crossShopPayment = await call(`/payments/${payment.body.payment._id}`, ownerB.accessToken);
  const crossShopJob = await call(`/production/${jobId}`, ownerB.accessToken);
  assert.equal(crossShopPayment.response.status, 404);
  assert.equal(crossShopJob.response.status, 404);

  await User.updateOne({ email: emailB }, { $set: { role: 'TAILOR' } });
  assert.equal((await call('/payments', ownerB.accessToken)).response.status, 403);

  const voidResult = await call(`/payments/${remaining.body.payment._id}`, ownerA.accessToken, { method: 'DELETE' });
  assert.equal(voidResult.response.status, 200);
  const orderAfterVoid = await call(`/orders/${orderId}`, ownerA.accessToken);
  assert.equal(orderAfterVoid.body.order.payment.paidAmount, 25);
  assert.equal(orderAfterVoid.body.order.payment.status, 'partial');

  const ledger = await call(`/payments?orderId=${orderId}&limit=20`, ownerA.accessToken);
  assert.equal(ledger.response.status, 200);
  assert.equal(ledger.body.pagination.total, 3);

  const secondOrder = await call('/orders', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ customerId, items: [{ garment: garmentId, quantity: 1, price: 100 }], totalAmount: 100 }),
  });
  assert.equal(secondOrder.response.status, 201);
  const secondJobId = (await call('/production', ownerA.accessToken)).body.jobs
    .find((job) => String(job.orderId._id) === String(secondOrder.body.order._id))._id;
  const cancelledOrder = await call(`/orders/${secondOrder.body.order._id}/cancel`, ownerA.accessToken, { method: 'PATCH' });
  assert.equal(cancelledOrder.response.status, 200);
  const cancelledJob = await call(`/production/${secondJobId}`, ownerA.accessToken);
  assert.equal(cancelledJob.body.job.stage, 'cancelled');

  const centsOrder = await call('/orders', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ customerId, items: [{ garment: garmentId, quantity: 1, price: 0.3 }], totalAmount: 0.3 }),
  });
  assert.equal(centsOrder.response.status, 201);
  const firstCentPayment = await call('/payments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ orderId: centsOrder.body.order._id, amount: 0.1, method: 'cash' }),
  });
  assert.equal(firstCentPayment.response.status, 201);
  const secondCentPayment = await call('/payments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ orderId: centsOrder.body.order._id, amount: 0.2, method: 'cash' }),
  });
  assert.equal(secondCentPayment.response.status, 201);
  const paidCentsOrder = await call(`/orders/${centsOrder.body.order._id}`, ownerA.accessToken);
  assert.equal(paidCentsOrder.body.order.payment.paidAmount, 0.3);
  assert.equal(paidCentsOrder.body.order.payment.status, 'paid');
});
