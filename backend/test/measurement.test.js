import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Customer from '../src/models/Customer.js';
import Garment from '../src/models/Garment.js';
import MeasurementTemplate from '../src/models/MeasurementTemplate.js';
import MeasurementProfile from '../src/models/MeasurementProfile.js';
import Order from '../src/models/Order.js';
import Shop from '../src/models/Shop.js';
import User from '../src/models/User.js';
import { config } from '../src/config/env.js';

const server = http.createServer(app);
const emailA = `measure-a-${Date.now()}@example.com`;
const emailB = `measure-b-${Date.now()}@example.com`;
let baseUrl;
let ownerA;
let ownerB;
let templateId;
let customerId;
let orderId;
let garmentId;
const shopIds = [];

const call = async (path, token, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
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
  await Customer.deleteMany({ _id: customerId });
  await MeasurementProfile.deleteMany({ customerId });
  await Order.deleteMany({ _id: orderId });
  await Garment.deleteMany({ _id: garmentId });
  await MeasurementTemplate.deleteMany({ _id: templateId });
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await Shop.deleteMany({ _id: { $in: shopIds } });
  await mongoose.disconnect();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('creates and validates dynamic measurement templates', async () => {
  ownerA = await register(emailA, 'Measurement Owner A');
  ownerB = await register(emailB, 'Measurement Owner B');

  const invalid = await call('/measurements/templates', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Invalid', fields: [{ key: 'style', label: 'Style', type: 'select', required: true }] }),
  });
  assert.equal(invalid.response.status, 400);

  const created = await call('/measurements/templates', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Shalwar Kameez',
      fields: [
        { key: 'length', label: 'Length', type: 'number', unit: 'inch', required: true },
        { key: 'fit', label: 'Fit', type: 'select', options: ['regular', 'slim'], required: true },
        { key: 'notes', label: 'Notes', type: 'text' },
        { key: 'lined', label: 'Lined', type: 'boolean' },
      ],
    }),
  });
  assert.equal(created.response.status, 201);
  templateId = created.body.data.template._id;

  const customer = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Ayesha Khan', phone: '555-2121' }),
  });
  assert.equal(customer.response.status, 201);
  customerId = customer.body.customer._id;

  const missingRequired = await call(`/customers/${customerId}/measurements`, ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ templateId, values: { fit: 'regular' } }),
  });
  assert.equal(missingRequired.response.status, 400);

  const assigned = await call(`/customers/${customerId}/measurements`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ templateId, values: { length: 42, fit: 'regular', notes: 'Long sleeve', lined: true } }),
  });
  assert.equal(assigned.response.status, 201);
  assert.equal(assigned.body.data.customer.measurementTemplateId, templateId);
  assert.equal(assigned.body.data.customer.measurements.length, 42);

  const secondVersion = await call(`/customers/${customerId}/measurements`, ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ templateId, values: { length: 43, fit: 'slim', notes: 'Updated', lined: false } }),
  });
  assert.equal(secondVersion.response.status, 201);
  assert.equal(secondVersion.body.data.profile.version, 2);

  const history = await call(`/customers/${customerId}/measurements`, ownerA.accessToken);
  assert.equal(history.response.status, 200);
  assert.equal(history.body.data.profiles.length, 2);

  const garment = await call('/garments', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: `Snapshot Garment ${Date.now()}`, category: 'shirt', basePrice: 1000, estimatedDays: 5 }),
  });
  assert.equal(garment.response.status, 201);
  garmentId = garment.body.garment._id;

  const order = await call('/orders', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ customerId, items: [{ garment: garmentId, quantity: 1, price: 1000 }], totalAmount: 1000 }),
  });
  assert.equal(order.response.status, 201);
  orderId = order.body.order._id;
  assert.equal(order.body.order.items[0].measurementSnapshot.version, 2);
  assert.equal(order.body.order.items[0].measurementSnapshot.values.length, 43);

  const thirdVersion = await call(`/customers/${customerId}/measurements`, ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ templateId, values: { length: 44, fit: 'regular', notes: 'Later update', lined: true } }),
  });
  assert.equal(thirdVersion.body.data.profile.version, 3);
  const savedOrder = await call(`/orders/${orderId}`, ownerA.accessToken);
  assert.equal(savedOrder.body.order.items[0].measurementSnapshot.version, 2);
  assert.equal(savedOrder.body.order.items[0].measurementSnapshot.values.length, 43);

  const templates = await call('/measurements/templates', ownerA.accessToken);
  assert.equal(templates.response.status, 200);
  assert.equal(templates.body.data.templates.length, 1);

  const crossTenant = await call(`/measurements/templates/${templateId}`, ownerB.accessToken);
  assert.equal(crossTenant.response.status, 404);
});
