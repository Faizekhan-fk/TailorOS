import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './notifications.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/', requirePermission('notifications.view'), controller.listNotifications);
router.patch('/read-all', requirePermission('notifications.view'), controller.markAllRead);
router.post('/', requirePermission('notifications.manage'), controller.createAnnouncement);
router.patch('/:id/read', requirePermission('notifications.view'), controller.markRead);
export default router;
