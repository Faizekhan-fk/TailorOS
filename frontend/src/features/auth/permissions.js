import { isSuperAdmin } from './roles';

export const hasPermission = (user, permission) =>
  isSuperAdmin(user?.role) || Boolean(user?.permissions?.includes(permission));

export const hasAnyPermission = (user, permissions) =>
  permissions.some((permission) => hasPermission(user, permission));
