import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './barcodes.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/:type/:id', requirePermission('barcodes.view'), controller.generateCode);
router.post('/resolve', requirePermission('barcodes.resolve'), controller.resolveCode);
export default router;
