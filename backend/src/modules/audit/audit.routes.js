import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import { listAuditLogs } from './audit.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/', requirePermission('audit_logs.view'), listAuditLogs);
export default router;
