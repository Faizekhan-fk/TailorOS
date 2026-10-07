import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './purchases.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/', requirePermission('purchases.view'), controller.listPurchases);
router.post('/', requirePermission('purchases.create'), controller.createPurchase);
router.get('/:id', requirePermission('purchases.view'), controller.getPurchase);
router.post('/:id/receive', requirePermission('purchases.update'), controller.receivePurchase);
router.delete('/:id', requirePermission('purchases.delete'), controller.cancelPurchase);
export default router;
