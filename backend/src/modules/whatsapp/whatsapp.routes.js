import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './whatsapp.controller.js';

const router = Router();
router.get('/webhook', controller.verifyWebhook);
router.post('/webhook', controller.receiveWebhook);
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/status', requirePermission('whatsapp.view'), controller.getStatus);
router.get('/messages', requirePermission('whatsapp.view'), controller.listMessages);
router.post('/customers/:customerId/consent', requirePermission('whatsapp.manage'), controller.setConsent);
router.post('/messages', requirePermission('whatsapp.send'), controller.sendOrderUpdate);
export default router;
