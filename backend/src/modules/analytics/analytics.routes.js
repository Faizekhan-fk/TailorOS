import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import { dashboardAnalytics } from '../reports/reports.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/overview', requirePermission('analytics.view'), dashboardAnalytics);
export default router;
