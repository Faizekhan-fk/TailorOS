import express from 'express';
import * as controller from './suppliers.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

router.use(authenticate, requireTenant);
router.get('/', requirePermission('suppliers.view'), controller.getSuppliers);
router.get('/:id', requirePermission('suppliers.view'), controller.getSupplierById);
router.post('/', requirePermission('suppliers.create'), controller.createSupplier);
router.put('/:id', requirePermission('suppliers.update'), controller.updateSupplier);
router.delete('/:id', requirePermission('suppliers.delete'), controller.deleteSupplier);

export default router;
