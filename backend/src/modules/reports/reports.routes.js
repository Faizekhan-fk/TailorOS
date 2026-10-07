import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './reports.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/financial', requirePermission('reports.view'), controller.financialReport);
router.get('/production', requirePermission('reports.view'), controller.productionReport);
export default router;
