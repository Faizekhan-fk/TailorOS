import express from 'express';
import {
  createGarment,
  getGarments,
  getGarmentById,
  updateGarment,
  deleteGarment,
} from './garments.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

router.use(authenticate, requireTenant);
router.get('/', requirePermission('garments.view'), getGarments);
router.get('/:id', requirePermission('garments.view'), getGarmentById);
router.post('/', requirePermission('garments.create'), createGarment);
router.put('/:id', requirePermission('garments.update'), updateGarment);
router.delete('/:id', requirePermission('garments.delete'), deleteGarment);

export default router;
