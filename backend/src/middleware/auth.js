import User from '../models/User.js';
import { verifyAccessToken } from '../utils/tokenManager.js';
import { getRolePermissions, normalizeRole } from '../config/rolePermissions.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired access token', errors: [] });
    }

    const user = await User.findById(decoded.userId).select('_id name firstName lastName email phone role shopId shop status isActive');
    if (!user || user.status === 'INACTIVE' || user.isActive === false) {
      return res.status(401).json({ success: false, message: 'User account is inactive', errors: [] });
    }

    req.user = {
      id: String(user._id),
      userId: String(user._id),
      name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' '),
      email: user.email,
      phone: user.phone,
      role: normalizeRole(user.role),
      permissions: getRolePermissions(user.role),
      shopId: user.shopId || user.shop || null,
      status: user.status,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const authenticate = requireAuth;

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required', errors: [] });
    }

    const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRole(role));
    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this action', errors: [] });
    }

    next();
  };
};

export const rbac = (req, res, next) => {
  // RBAC information available in req.user.role
  next();
};
