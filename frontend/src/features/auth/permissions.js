export const hasPermission = (user, permission) =>
  user?.role === 'SUPER_ADMIN' || Boolean(user?.permissions?.includes(permission));

export const hasAnyPermission = (user, permissions) =>
  permissions.some((permission) => hasPermission(user, permission));
