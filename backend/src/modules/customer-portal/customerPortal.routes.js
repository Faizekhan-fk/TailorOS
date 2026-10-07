import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './customerPortal.controller.js';

const router = Router();
const requireSelectedShop = (req, res, next) => {
  if (!req.tenantId) return res.status(400).json({ success: false, message: 'Select a shop context', errors: [] });
  return next();
};
router.post('/auth/login', controller.portalLogin);
router.get('/accounts', authenticate, requireTenant, requireSelectedShop, requirePermission('customer_portal.view'), controller.listPortalAccounts);
router.post('/accounts', authenticate, requireTenant, requireSelectedShop, requirePermission('customer_portal.manage'), controller.createPortalAccount);
router.patch('/accounts/:id', authenticate, requireTenant, requireSelectedShop, requirePermission('customer_portal.manage'), controller.updatePortalAccount);
router.get('/me', controller.requirePortal, controller.getPortalProfile);
router.get('/me/orders', controller.requirePortal, controller.getPortalOrders);
router.get('/me/invoices', controller.requirePortal, controller.getPortalInvoices);
router.get('/me/measurements', controller.requirePortal, controller.getPortalMeasurements);
export default router;
