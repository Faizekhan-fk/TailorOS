import mongoose from 'mongoose';
import { normalizeRole } from '../config/rolePermissions.js';

const isSuperAdmin = (user) => normalizeRole(user?.role) === 'SUPER_ADMIN';

export const requireTenant = (req, res, next) => {
  const requestedShopId = req.headers['x-shop-id'];
  const authenticatedShopId = req.user?.shopId;

  if (isSuperAdmin(req.user)) {
    if (requestedShopId && !mongoose.isValidObjectId(requestedShopId)) {
      return res.status(400).json({ success: false, message: 'Invalid shop context', errors: [] });
    }
    req.tenantId = requestedShopId || null;
    if (!req.tenantId && !['GET', 'HEAD'].includes(req.method)) {
      return res.status(400).json({ success: false, message: 'X-Shop-Id is required for super-admin writes', errors: [] });
    }
    return next();
  }

  if (!authenticatedShopId || !mongoose.isValidObjectId(authenticatedShopId)) {
    return res.status(403).json({ success: false, message: 'User is not assigned to a shop', errors: [] });
  }

  // Normal users can never override this with a browser-supplied shop id.
  req.tenantId = String(authenticatedShopId);
  return next();
};

export const tenantFilter = (req) => (req.tenantId ? { shopId: req.tenantId } : {});

export const scopedFilter = (req, filter = {}) => ({ ...filter, ...tenantFilter(req) });
