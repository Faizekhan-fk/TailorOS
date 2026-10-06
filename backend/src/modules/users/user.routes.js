import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { requirePermission } from '../auth/permission.middleware.js';
import { create, getRoles, getUsers, remove, update, updateRole } from './user.controller.js';

const router = Router();
router.use(requireAuth, requireTenant);
router.get('/', requirePermission('users.view'), getUsers);
router.post('/', requirePermission('users.create'), create);
router.get('/roles', requirePermission('roles.view'), getRoles);
router.patch('/:id', requirePermission('users.update'), update);
router.patch('/:id/role', requirePermission('roles.manage'), updateRole);
router.delete('/:id', requirePermission('users.delete'), remove);

export default router;
