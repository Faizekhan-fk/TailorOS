import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { config } from '../src/config/env.js';

const server = http.createServer(app);
const email = `phase2-${Date.now()}@example.com`;
const managedEmail = `managed-${Date.now()}@example.com`;
let baseUrl;
let accessToken;
let refreshCookie;
let userId;

const request = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (refreshCookie) headers.Cookie = refreshCookie;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  const cookies = response.headers.getSetCookie?.() || [];
  const nextCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='));
  if (nextCookie) refreshCookie = nextCookie.split(';')[0];
  return { response, body };
};

before(async () => {
  await mongoose.connect(config.MONGODB_URI);
  await User.deleteMany({ email: { $in: [email, managedEmail] } });
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  await User.deleteMany({ email: { $in: [email, managedEmail] } });
  await mongoose.disconnect();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('rejects protected requests without a token', async () => {
  const { response, body } = await request('/auth/me', { headers: { Cookie: '' } });
  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test('rejects invalid registration data', async () => {
  const { response, body } = await request('/auth/register', {
    method: 'POST', body: JSON.stringify({ name: 'A', email: 'bad', password: 'short' }),
  });
  assert.equal(response.status, 400);
  assert.ok(body.errors.length > 0);
});

test('registers a shop owner without exposing credentials', async () => {
  const { response, body } = await request('/auth/register', {
    method: 'POST', body: JSON.stringify({
      name: 'Phase Two Owner',
      email,
      password: 'Password123!',
      phone: '555-0100',
      role: 'SUPER_ADMIN',
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.user.role, 'SHOP_OWNER');
  assert.equal(body.data.user.passwordHash, undefined);
  assert.ok(body.data.accessToken);
  accessToken = body.data.accessToken;
  userId = body.data.user.id;
});

test('ignores a role claim in the access token and uses the stored user role', async () => {
  const tokenWithForgedRole = jwt.sign(
    { userId, role: 'SUPER_ADMIN' },
    config.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const { response } = await request('/shops', {
    headers: { Authorization: `Bearer ${tokenWithForgedRole}` },
  });

  assert.equal(response.status, 403);
});

test('rejects a duplicate email', async () => {
  const { response } = await request('/auth/register', {
    method: 'POST', body: JSON.stringify({ name: 'Duplicate', email, password: 'Password123!' }),
  });
  assert.equal(response.status, 409);
});

test('rejects an invalid password and nonexistent user', async () => {
  const invalid = await request('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password: 'wrong-password' }),
  });
  const missing = await request('/auth/login', {
    method: 'POST', body: JSON.stringify({ email: 'missing@example.com', password: 'Password123!' }),
  });
  assert.equal(invalid.response.status, 401);
  assert.equal(missing.response.status, 401);
});

test('logs in successfully and returns a safe user', async () => {
  const { response, body } = await request('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password: 'Password123!' }),
  });
  assert.equal(response.status, 200);
  assert.ok(body.data.accessToken);
  assert.equal(body.data.user.passwordHash, undefined);
  accessToken = body.data.accessToken;
});

test('rejects an inactive user', async () => {
  await User.findByIdAndUpdate(userId, { status: 'INACTIVE', isActive: false });
  const { response } = await request('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password: 'Password123!' }),
  });
  await User.findByIdAndUpdate(userId, { status: 'ACTIVE', isActive: true });
  assert.equal(response.status, 403);
});

test('rejects an invalid bearer token', async () => {
  const { response } = await request('/auth/me', { headers: { Authorization: 'Bearer invalid' } });
  assert.equal(response.status, 401);
});

test('loads the current user from a valid access token', async () => {
  const { response, body } = await request('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.user.id, userId);
});

test('lists users and roles using trusted permissions', async () => {
  const users = await request('/users', { headers: { Authorization: `Bearer ${accessToken}` } });
  const roles = await request('/users/roles', { headers: { Authorization: `Bearer ${accessToken}` } });
  assert.equal(users.response.status, 200);
  assert.equal(roles.response.status, 200);
  assert.ok(roles.body.data.roles.some((role) => role.role === 'SHOP_OWNER'));
});

test('prevents a shop owner from assigning SUPER_ADMIN', async () => {
  const created = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'Managed Tailor', email: managedEmail, password: 'Password123!', role: 'TAILOR' }),
  });
  assert.equal(created.response.status, 201);
  const promoted = await request(`/users/${created.body.data.user.id}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ role: 'SUPER_ADMIN' }),
  });
  assert.equal(promoted.response.status, 403);
});

test('requires role and rejects client-provided internal user fields', async () => {
  const missingRole = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'Missing Role', email: `missing-role-${Date.now()}@example.com`, password: 'Password123!' }),
  });
  const clientShop = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      name: 'Forged Shop',
      email: `forged-shop-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'TAILOR',
      shopId: new mongoose.Types.ObjectId().toString(),
    }),
  });

  assert.equal(missingRole.response.status, 400);
  assert.equal(clientShop.response.status, 400);
});

test('rotates the refresh token', async () => {
  const previousCookie = refreshCookie;
  const { response, body } = await request('/auth/refresh', { method: 'POST' });
  assert.equal(response.status, 200);
  assert.ok(body.data.accessToken);
  assert.notEqual(refreshCookie, previousCookie);
});

test('revokes the refresh token on logout', async () => {
  const { response } = await request('/auth/logout', { method: 'POST' });
  assert.equal(response.status, 200);
  const refreshed = await request('/auth/refresh', { method: 'POST' });
  assert.equal(refreshed.response.status, 401);
});
