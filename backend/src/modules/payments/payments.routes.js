import express from 'express';
import * as controller from './payments.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

router.use(authenticate, requireTenant);
router.get('/', requirePermission('payments.view'), controller.listPayments);
router.get('/:id', requirePermission('payments.view'), controller.getPayment);
router.post('/', requirePermission('payments.create'), controller.createPayment);
router.patch('/:id', requirePermission('payments.update'), controller.updatePayment);
router.post('/:id/refunds', requirePermission('payments.create'), controller.refundPayment);
router.delete('/:id', requirePermission('payments.delete'), controller.voidPayment);

export default router;
