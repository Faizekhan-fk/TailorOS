import { normalizeRole } from '../../config/rolePermissions.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
  }

  const allowedRoles = roles.map(normalizeRole);
  if (!allowedRoles.includes(normalizeRole(req.user.role))) {
    return res.status(403).json({ success: false, message: 'Role not permitted for this action', errors: [] });
  }

  return next();
};
