import express from 'express';
import * as controller from './tailors.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

router.use(authenticate, requireTenant);
router.get('/', requirePermission('users.view'), controller.getTailors);
router.get('/:id', requirePermission('users.view'), controller.getTailorById);
router.post('/', requirePermission('users.create'), controller.createTailor);
router.put('/:id', requirePermission('users.update'), controller.updateTailor);
router.delete('/:id', requirePermission('users.delete'), controller.deleteTailor);

export default router;
