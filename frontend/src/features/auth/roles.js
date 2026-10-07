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

export const isSuperAdmin = (role) => role === SYSTEM_ROLES[0];
