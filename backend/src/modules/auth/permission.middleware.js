import { isKnownPermission } from '../../config/permissions.js';
import { getRolePermissions, normalizeRole } from '../../config/rolePermissions.js';

const forbidden = (res) => res.status(403).json({
  success: false,
  message: 'You do not have permission to perform this action',
  errors: [],
});

const validatePermissions = (permissions) => {
  const unknown = permissions.filter((permission) => !isKnownPermission(permission));
  if (unknown.length) {
    const error = new Error(`Unknown permission: ${unknown.join(', ')}`);
    error.status = 500;
    throw error;
  }
};

export const requirePermission = (...permissions) => (req, res, next) => {
  try {
    validatePermissions(permissions);
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    const role = normalizeRole(req.user.role);
    const granted = getRolePermissions(role);
    if (role === 'SUPER_ADMIN' || permissions.every((permission) => granted.includes(permission))) {
      req.user.permissions = granted;
      return next();
    }
    return forbidden(res);
  } catch (error) {
    return next(error);
  }
};

export const requireAnyPermission = (...permissions) => (req, res, next) => {
  try {
    validatePermissions(permissions);
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    const role = normalizeRole(req.user.role);
    const granted = getRolePermissions(role);
    if (role === 'SUPER_ADMIN' || permissions.some((permission) => granted.includes(permission))) {
      req.user.permissions = granted;
      return next();
    }
    return forbidden(res);
  } catch (error) {
    return next(error);
  }
};
