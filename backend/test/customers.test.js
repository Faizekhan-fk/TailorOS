import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Customer from '../src/models/Customer.js';
import CustomerCounter from '../src/modules/customers/customerCounter.model.js';
import Shop from '../src/models/Shop.js';
import User from '../src/models/User.js';
import { config } from '../src/config/env.js';

const server = http.createServer(app);
const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const emailA = `customer-a-${suffix}@example.com`;
const emailB = `customer-b-${suffix}@example.com`;
const shopIds = [];
let baseUrl;
let ownerA;
let ownerB;
let firstCustomerId;

const call = async (path, token, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
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
  await Customer.deleteMany({ shopId: { $in: shopIds } });
  await CustomerCounter.deleteMany({ shopId: { $in: shopIds } });
  await User.deleteMany({ email: { $in: [emailA, emailB] } });
  await Shop.deleteMany({ _id: { $in: shopIds } });
  await mongoose.disconnect();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('customer CRUD validates inputs, scopes tenants, searches, paginates, and soft-deletes', async () => {
  ownerA = await register(emailA, 'Customer Owner A');
  ownerB = await register(emailB, 'Customer Owner B');

  const unauthorized = await call('/customers');
  assert.equal(unauthorized.response.status, 401);

  const invalid = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'A', phone: '5' }),
  });
  assert.equal(invalid.response.status, 400);

  const forgedTenant = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Forged Shop', phone: '555-9001', shopId: ownerB.user.shopId }),
  });
  assert.equal(forgedTenant.response.status, 400);

  const created = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Ayesha Khan',
      phone: '555-2201',
      whatsapp: '555-2202',
      email: `ayesha-${suffix}@example.com`,
      gender: 'FEMALE',
      address: 'Lahore',
      notes: 'Prefers slim fit',
      tags: ['VIP', 'Regular'],
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.customer.customerNumber, 'CUS-000001');
  assert.equal(String(created.body.customer.shopId), String(ownerA.user.shopId));
  firstCustomerId = created.body.customer._id;

  const second = await call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Ahmed Khan', phone: '555-2203', gender: 'male', tags: ['Regular'] }),
  });
  assert.equal(second.response.status, 201);
  assert.equal(second.body.customer.customerNumber, 'CUS-000002');

  const concurrentCreates = await Promise.all([3, 4, 5].map((index) => call('/customers', ownerA.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: `Concurrent ${index}`, phone: `555-22${index}` }),
  })));
  assert.ok(concurrentCreates.every(({ response }) => response.status === 201));
  assert.deepEqual(
    concurrentCreates.map(({ body }) => body.customer.customerNumber).sort(),
    ['CUS-000003', 'CUS-000004', 'CUS-000005']
  );

  const search = await call(`/customers?search=${encodeURIComponent('555-2202')}&status=ACTIVE&gender=female&tag=VIP`, ownerA.accessToken);
  assert.equal(search.response.status, 200);
  assert.equal(search.body.pagination.total, 1);
  assert.equal(search.body.customers[0]._id, firstCustomerId);

  const pagination = await call('/customers?page=2&limit=1&sortBy=customerNumber&sortOrder=asc', ownerA.accessToken);
  assert.equal(pagination.response.status, 200);
  assert.equal(pagination.body.pagination.page, 2);
  assert.equal(pagination.body.pagination.limit, 1);
  assert.equal(pagination.body.pagination.total, 5);
  assert.equal(pagination.body.pagination.totalPages, 5);
  assert.equal(pagination.body.customers[0].customerNumber, 'CUS-000002');

  const detail = await call(`/customers/${firstCustomerId}`, ownerA.accessToken);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.customer.email, `ayesha-${suffix}@example.com`);

  const crossTenantRead = await call(`/customers/${firstCustomerId}`, ownerB.accessToken);
  const crossTenantUpdate = await call(`/customers/${firstCustomerId}`, ownerB.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Changed by another shop' }),
  });
  const crossTenantDelete = await call(`/customers/${firstCustomerId}`, ownerB.accessToken, { method: 'DELETE' });
  assert.equal(crossTenantRead.response.status, 404);
  assert.equal(crossTenantUpdate.response.status, 404);
  assert.equal(crossTenantDelete.response.status, 404);

  const otherTenantCustomer = await call('/customers', ownerB.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Customer in Shop B', phone: '555-3300' }),
  });
  assert.equal(otherTenantCustomer.response.status, 201);
  assert.equal(otherTenantCustomer.body.customer.customerNumber, 'CUS-000001');

  await User.updateOne({ email: emailB }, { $set: { role: 'TAILOR' } });
  const forbiddenCreate = await call('/customers', ownerB.accessToken, {
    method: 'POST',
    body: JSON.stringify({ name: 'Forbidden Customer', phone: '555-9000' }),
  });
  assert.equal(forbiddenCreate.response.status, 403);

  const updated = await call(`/customers/${firstCustomerId}`, ownerA.accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ name: 'Ayesha Updated', notes: 'Updated notes' }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.customer.name, 'Ayesha Updated');
  assert.equal(updated.body.customer.firstName, 'Ayesha');
  assert.equal(updated.body.customer.lastName, 'Updated');

  const deleteResult = await call(`/customers/${firstCustomerId}`, ownerA.accessToken, { method: 'DELETE' });
  assert.equal(deleteResult.response.status, 200);
  const retained = await Customer.findById(firstCustomerId);
  assert.ok(retained.deletedAt);
  assert.equal(retained.status, 'INACTIVE');
  const afterDeleteList = await call('/customers', ownerA.accessToken);
  assert.equal(afterDeleteList.body.pagination.total, 4);
  const afterDeleteRead = await call(`/customers/${firstCustomerId}`, ownerA.accessToken);
  assert.equal(afterDeleteRead.response.status, 404);
});
