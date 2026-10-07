import express from 'express';
import * as controller from './production.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

router.use(authenticate, requireTenant);
router.get('/', requirePermission('production.view'), controller.listProductionJobs);
router.post('/orders/:orderId/jobs', requirePermission('production.create'), controller.createOrderProductionJobs);
router.get('/:id', requirePermission('production.view'), controller.getProductionJob);
router.patch('/:id/stage', requirePermission('production.update'), controller.updateProductionStage);
router.patch('/:id/assignment', requirePermission('production.assign'), controller.assignProductionJob);

export default router;
