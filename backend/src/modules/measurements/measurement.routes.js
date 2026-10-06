import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from './measurement.controller.js';

const router = Router();
router.use(requireAuth, requireTenant);
router.get('/templates', requirePermission('measurements.view'), listTemplates);
router.get('/templates/:id', requirePermission('measurements.view'), getTemplate);
router.post('/templates', requirePermission('measurements.create'), createTemplate);
router.patch('/templates/:id', requirePermission('measurements.update'), updateTemplate);
router.delete('/templates/:id', requirePermission('measurements.delete'), deleteTemplate);

export default router;
