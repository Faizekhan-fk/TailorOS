import test from 'node:test';
import assert from 'node:assert/strict';
import { requireRole } from '../src/modules/auth/role.middleware.js';

const response = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('requireRole returns 401 when the request is unauthenticated', () => {
  const res = response();
  let nextCalled = false;

  requireRole('SHOP_OWNER')({}, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireRole returns 403 for an authenticated user without an allowed role', () => {
  const res = response();
  let nextCalled = false;

  requireRole('SHOP_OWNER')({ user: { role: 'MANAGER' } }, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('requireRole allows a trusted user with an allowed role', () => {
  const res = response();
  let nextCalled = false;

  requireRole('SHOP_OWNER', 'MANAGER')({ user: { role: 'MANAGER' } }, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, null);
  assert.equal(nextCalled, true);
});
