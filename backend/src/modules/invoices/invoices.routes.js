import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './invoices.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/', requirePermission('invoices.view'), controller.listInvoices);
router.post('/', requirePermission('invoices.create'), controller.issueInvoice);
router.get('/:id', requirePermission('invoices.view'), controller.getInvoice);
router.delete('/:id', requirePermission('invoices.delete'), controller.voidInvoice);
export default router;
