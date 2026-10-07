import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSION_CATALOG, PERMISSIONS } from '../src/config/permissions.js';
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
    assert.equal(Object.isFrozen(ROLE_PERMISSIONS[role]), true);
  }
});

test('permission catalog contains the supported granular resource actions', () => {
  const expected = [
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'measurements.view', 'measurements.create', 'measurements.update', 'measurements.delete',
    'garments.view', 'garments.create', 'garments.update', 'garments.delete',
    'orders.view', 'orders.create', 'orders.update', 'orders.cancel', 'orders.delete',
    'payments.view', 'payments.create', 'payments.update', 'payments.delete',
    'production.view', 'production.create', 'production.update', 'production.assign',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.adjust',
    'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
    'purchases.view', 'purchases.create', 'purchases.update', 'purchases.delete',
    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.delete',
    'invoices.view', 'invoices.create', 'invoices.update', 'invoices.delete',
    'reports.view',
    'notifications.view', 'notifications.manage',
    'customer_portal.view', 'customer_portal.manage', 'analytics.view',
    'users.view', 'users.create', 'users.update', 'users.delete',
    'roles.view', 'roles.manage',
    'settings.view', 'settings.manage',
    'audit_logs.view',
    'whatsapp.view', 'whatsapp.send', 'whatsapp.manage',
    'barcodes.view', 'barcodes.resolve',
  ];

  assert.deepEqual(PERMISSIONS, expected);
  assert.equal(new Set(PERMISSIONS).size, PERMISSIONS.length);
  assert.deepEqual(
    PERMISSIONS,
    Object.entries(PERMISSION_CATALOG).flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}.${action}`)
    )
  );
  assert.equal(Object.isFrozen(PERMISSION_CATALOG), true);
});

test('super administrators receive every registered permission', () => {
  assert.deepEqual(new Set(getRolePermissions('SUPER_ADMIN')), new Set(PERMISSIONS));
});

test('operational roles receive least-privilege permissions', () => {
  assert.equal(roleHasPermission('RECEPTIONIST', 'customers.create'), true);
  assert.equal(roleHasPermission('RECEPTIONIST', 'users.delete'), false);
  assert.equal(roleHasPermission('RECEPTIONIST', 'orders.cancel'), false);
  assert.equal(roleHasPermission('ACCOUNTANT', 'payments.create'), true);
  assert.equal(roleHasPermission('ACCOUNTANT', 'orders.cancel'), false);
  assert.equal(roleHasPermission('TAILOR', 'production.update'), true);
  assert.equal(roleHasPermission('TAILOR', 'inventory.adjust'), false);
  assert.equal(roleHasPermission('QUALITY_CONTROL', 'customers.view'), false);
  assert.equal(roleHasPermission('CUTTER', 'production.assign'), false);
  assert.equal(roleHasPermission('MANAGER', 'payments.delete'), true);
  assert.equal(roleHasPermission('MANAGER', 'expenses.delete'), true);
  assert.equal(roleHasPermission('MANAGER', 'users.delete'), false);
  assert.equal(roleHasPermission('MANAGER', 'roles.manage'), false);
  assert.equal(roleHasPermission('ACCOUNTANT', 'expenses.delete'), false);
  assert.equal(roleHasPermission('SHOP_OWNER', 'roles.manage'), true);
});

test('legacy role names normalize without weakening the registry', () => {
  assert.equal(normalizeRole('admin'), 'SUPER_ADMIN');
  assert.equal(normalizeRole('manager'), 'MANAGER');
  assert.equal(normalizeRole('staff'), 'RECEPTIONIST');
  assert.equal(roleHasPermission('staff', 'customers.create'), true);
});
