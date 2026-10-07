import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Customer from '../src/models/Customer.js';
import Shop from '../src/models/Shop.js';
import User from '../src/models/User.js';
import { config } from '../src/config/env.js';

const server = http.createServer(app);
const emailA = `tenant-a-${Date.now()}@example.com`;
const emailB = `tenant-b-${Date.now()}@example.com`;
let baseUrl;
let customerId;
let shopIds = [];

const call = async (path, token, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
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
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await Shop.deleteMany({ _id: { $in: shopIds } });
  await mongoose.disconnect();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('isolates business records by the authenticated shop', async () => {
  const ownerA = await register(emailA, 'Tenant A Owner');
  const ownerB = await register(emailB, 'Tenant B Owner');

  const ownerAProfile = await call(`/users/${ownerA.user.id}`, ownerA.accessToken);
  const crossShopProfile = await call(`/users/${ownerA.user.id}`, ownerB.accessToken);
  assert.equal(ownerAProfile.response.status, 200);
  assert.equal(ownerAProfile.body.data.user.id, ownerA.user.id);
  assert.equal(crossShopProfile.response.status, 404);

  const created = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      firstName: 'Private',
      lastName: 'Customer',
      phone: '555-1000',
      shopId: ownerB.user.shopId,
    }),
  });
  assert.equal(created.response.status, 400);

  const tenantScopedCreate = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ firstName: 'Private', lastName: 'Customer', phone: '555-1000' }),
  });
  assert.equal(tenantScopedCreate.response.status, 201);
  customerId = tenantScopedCreate.body.customer._id;
  assert.equal(String(tenantScopedCreate.body.customer.shopId), String(ownerA.user.shopId));

  const listFromB = await call('/customers', ownerB.accessToken);
  assert.equal(listFromB.response.status, 200);
  assert.equal(listFromB.body.pagination.total, 0);

  const forgedContext = await call('/customers', ownerA.accessToken, {
    headers: { 'X-Shop-Id': ownerB.user.shopId },
  });
  assert.equal(forgedContext.response.status, 200);
  assert.equal(forgedContext.body.pagination.total, 1);

  const readFromB = await call(`/customers/${customerId}`, ownerB.accessToken);
  const updateFromB = await call(`/customers/${customerId}`, ownerB.accessToken, {
    method: 'PUT',
    body: JSON.stringify({ phone: '555-9999' }),
  });
  const deleteFromB = await call(`/customers/${customerId}`, ownerB.accessToken, { method: 'DELETE' });

  assert.equal(readFromB.response.status, 404);
  assert.equal(updateFromB.response.status, 404);
  assert.equal(deleteFromB.response.status, 404);
});
