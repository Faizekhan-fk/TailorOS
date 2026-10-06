import { PERMISSIONS } from './permissions.js';

const all = [...PERMISSIONS];
const pick = (...permissions) => permissions;

export const SYSTEM_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'SHOP_OWNER',
  'MANAGER',
  'RECEPTIONIST',
  'TAILOR',
  'CUTTER',
  'QUALITY_CONTROL',
  'ACCOUNTANT',
]);

export const LEGACY_ROLE_ALIASES = Object.freeze({
  ADMIN: 'SUPER_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SHOP_OWNER: 'SHOP_OWNER',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  TAILOR: 'TAILOR',
  CUTTER: 'CUTTER',
  QUALITY_CONTROL: 'QUALITY_CONTROL',
  ACCOUNTANT: 'ACCOUNTANT',
  admin: 'SUPER_ADMIN',
  manager: 'MANAGER',
  tailor: 'TAILOR',
  staff: 'RECEPTIONIST',
  shop_owner: 'SHOP_OWNER',
  'shop-owner': 'SHOP_OWNER',
  'super-admin': 'SUPER_ADMIN',
});

const shopOwner = all.filter((permission) => permission !== 'roles.manage');

export const ROLE_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: all,
  SHOP_OWNER: shopOwner,
  MANAGER: pick(
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'measurements.view', 'measurements.create', 'measurements.update', 'measurements.delete',
    'garments.view', 'garments.create', 'garments.update', 'garments.delete',
    'orders.view', 'orders.create', 'orders.update', 'orders.cancel',
    'production.view', 'production.create', 'production.update', 'production.assign',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.adjust',
    'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
    'purchases.view', 'purchases.create', 'purchases.update', 'purchases.delete',
    'expenses.view', 'expenses.create', 'expenses.update',
    'reports.view', 'notifications.view', 'notifications.manage',
    'users.view', 'users.create', 'users.update', 'roles.view', 'settings.view',
  ),
  RECEPTIONIST: pick(
    'customers.view', 'customers.create', 'customers.update',
    'measurements.view', 'measurements.create', 'measurements.update',
    'garments.view', 'orders.view', 'orders.create', 'orders.update', 'orders.cancel',
    'payments.view', 'payments.create', 'notifications.view',
  ),
  TAILOR: pick(
    'customers.view', 'measurements.view', 'garments.view', 'orders.view',
    'production.view', 'production.update', 'inventory.view', 'notifications.view',
  ),
  CUTTER: pick(
    'customers.view', 'measurements.view', 'garments.view', 'orders.view',
    'production.view', 'production.update', 'production.assign', 'inventory.view', 'notifications.view',
  ),
  QUALITY_CONTROL: pick(
    'customers.view', 'measurements.view', 'garments.view', 'orders.view',
    'production.view', 'production.update', 'notifications.view',
  ),
  ACCOUNTANT: pick(
    'customers.view', 'orders.view',
    'payments.view', 'payments.create', 'payments.update', 'payments.delete',
    'suppliers.view', 'purchases.view', 'purchases.create', 'purchases.update',
    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.delete',
    'reports.view', 'notifications.view', 'audit_logs.view',
  ),
});

export const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') return role;
  const normalized = role.trim().replace(/[-\s]+/g, '_').replace(/_+/g, '_');
  if (!normalized) return role;
  const upper = normalized.toUpperCase();
  return LEGACY_ROLE_ALIASES[upper] || LEGACY_ROLE_ALIASES[normalized] || upper;
};

export const getRolePermissions = (role) => ROLE_PERMISSIONS[normalizeRole(role)] || [];

export const roleHasPermission = (role, permission) =>
  getRolePermissions(role).includes(permission);
