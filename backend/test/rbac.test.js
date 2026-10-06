import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS } from '../src/config/permissions.js';
import {
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  getRolePermissions,
  normalizeRole,
  roleHasPermission,
} from '../src/config/rolePermissions.js';

test('every system role has a centralized permission set', () => {
  for (const role of SYSTEM_ROLES) {
    assert.ok(Array.isArray(ROLE_PERMISSIONS[role]));
    assert.ok(ROLE_PERMISSIONS[role].every((permission) => PERMISSIONS.includes(permission)));
  }
});

test('super administrators receive every registered permission', () => {
  assert.deepEqual(new Set(getRolePermissions('SUPER_ADMIN')), new Set(PERMISSIONS));
});

test('operational roles receive least-privilege permissions', () => {
  assert.equal(roleHasPermission('RECEPTIONIST', 'customers.create'), true);
  assert.equal(roleHasPermission('RECEPTIONIST', 'users.delete'), false);
  assert.equal(roleHasPermission('ACCOUNTANT', 'payments.create'), true);
  assert.equal(roleHasPermission('ACCOUNTANT', 'orders.cancel'), false);
  assert.equal(roleHasPermission('TAILOR', 'production.update'), true);
  assert.equal(roleHasPermission('TAILOR', 'inventory.adjust'), false);
});

test('legacy role names normalize without weakening the registry', () => {
  assert.equal(normalizeRole('admin'), 'SUPER_ADMIN');
  assert.equal(normalizeRole('manager'), 'MANAGER');
  assert.equal(normalizeRole('staff'), 'RECEPTIONIST');
  assert.equal(roleHasPermission('staff', 'customers.create'), true);
});
