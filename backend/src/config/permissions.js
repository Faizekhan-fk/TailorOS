export const PERMISSIONS = Object.freeze([
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
  'reports.view',
  'notifications.view', 'notifications.manage',
  'users.view', 'users.create', 'users.update', 'users.delete',
  'roles.view', 'roles.manage',
  'settings.view', 'settings.manage',
  'audit_logs.view',
]);

export const PERMISSION_SET = new Set(PERMISSIONS);

export const isKnownPermission = (permission) => PERMISSION_SET.has(permission);
