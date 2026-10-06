import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  deleteOrder,
} from './orders.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

router.use(authenticate, requireTenant);

router.post('/', requirePermission('orders.create'), createOrder);
router.get('/', requirePermission('orders.view'), getOrders);
router.get('/:id', requirePermission('orders.view'), getOrderById);
router.put('/:id', requirePermission('orders.update'), updateOrder);
router.patch('/:id/cancel', requirePermission('orders.cancel'), cancelOrder);
router.delete('/:id', requirePermission('orders.delete'), deleteOrder);

export default router;
