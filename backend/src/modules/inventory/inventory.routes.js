import express from 'express';
import {
  createInventoryItem,
  getInventory,
  getInventoryById,
  updateInventory,
  updateStock,
  deleteInventoryItem,
} from './inventory.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

router.use(authenticate, requireTenant);
router.get('/', requirePermission('inventory.view'), getInventory);
router.get('/:id', requirePermission('inventory.view'), getInventoryById);
router.post('/', requirePermission('inventory.create'), createInventoryItem);
router.put('/:id', requirePermission('inventory.update'), updateInventory);
router.patch('/:id/stock', requirePermission('inventory.adjust'), updateStock);
router.delete('/:id', requirePermission('inventory.delete'), deleteInventoryItem);

export default router;
