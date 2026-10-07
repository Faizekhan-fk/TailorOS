import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant, requireTenantContext } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import * as controller from './expenses.controller.js';

const router = Router();
router.use(authenticate, requireTenant, requireTenantContext);
router.get('/', requirePermission('expenses.view'), controller.listExpenses);
router.post('/', requirePermission('expenses.create'), controller.createExpense);
router.patch('/:id', requirePermission('expenses.update'), controller.updateExpense);
router.delete('/:id', requirePermission('expenses.delete'), controller.voidExpense);
export default router;
