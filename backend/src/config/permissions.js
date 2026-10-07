export const PERMISSION_CATALOG = Object.freeze({
  customers: Object.freeze(['view', 'create', 'update', 'delete']),
  measurements: Object.freeze(['view', 'create', 'update', 'delete']),
  garments: Object.freeze(['view', 'create', 'update', 'delete']),
  orders: Object.freeze(['view', 'create', 'update', 'cancel', 'delete']),
  payments: Object.freeze(['view', 'create', 'update', 'delete']),
  production: Object.freeze(['view', 'create', 'update', 'assign']),
  inventory: Object.freeze(['view', 'create', 'update', 'delete', 'adjust']),
  suppliers: Object.freeze(['view', 'create', 'update', 'delete']),
  purchases: Object.freeze(['view', 'create', 'update', 'delete']),
  expenses: Object.freeze(['view', 'create', 'update', 'delete']),
  invoices: Object.freeze(['view', 'create', 'update', 'delete']),
  reports: Object.freeze(['view']),
  notifications: Object.freeze(['view', 'manage']),
  customer_portal: Object.freeze(['view', 'manage']),
  analytics: Object.freeze(['view']),
  users: Object.freeze(['view', 'create', 'update', 'delete']),
  roles: Object.freeze(['view', 'manage']),
  settings: Object.freeze(['view', 'manage']),
  audit_logs: Object.freeze(['view']),
  whatsapp: Object.freeze(['view', 'send', 'manage']),
  barcodes: Object.freeze(['view', 'resolve']),
});

export const PERMISSIONS = Object.freeze(
  Object.entries(PERMISSION_CATALOG).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}.${action}`)
  )
);

export const PERMISSION_SET = new Set(PERMISSIONS);

export const isKnownPermission = (permission) => PERMISSION_SET.has(permission);
