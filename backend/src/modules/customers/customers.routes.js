import express from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  getCustomerMeasurements,
  getCustomerMeasurement,
  updateCustomer,
  updateCustomerMeasurements,
  deleteCustomer,
} from './customers.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';

const router = express.Router();

// All customer routes require authentication
router.use(authenticate, requireTenant);

router.post('/', requirePermission('customers.create'), createCustomer);
router.get('/', requirePermission('customers.view'), getCustomers);
router.get('/:id', requirePermission('customers.view'), getCustomerById);
router.get('/:id/measurements', requirePermission('measurements.view'), getCustomerMeasurements);
router.get('/:id/measurements/:profileId', requirePermission('measurements.view'), getCustomerMeasurement);
router.patch('/:id', requirePermission('customers.update'), updateCustomer);
router.put('/:id', requirePermission('customers.update'), updateCustomer);
router.post('/:id/measurements', requirePermission('measurements.create'), updateCustomerMeasurements);
router.patch('/:id/measurements', requirePermission('measurements.update'), updateCustomerMeasurements);
router.delete('/:id', requirePermission('customers.delete'), deleteCustomer);

export default router;
