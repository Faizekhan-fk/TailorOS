import { getRolePermissions, SYSTEM_ROLES } from '../../config/rolePermissions.js';
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  updateUserRole,
} from './user.service.js';
import {
  createUserSchema,
  updateRoleSchema,
  updateUserSchema,
  validationErrors,
} from './user.validation.js';

const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = validationErrors(result.error);
    throw error;
  }
  return result.data;
};

const notFound = () => {
  const error = new Error('User not found');
  error.status = 404;
  return error;
};

export const getUsers = async (req, res, next) => {
  try {
    const data = await listUsers(req.user, req.query, req.tenantId);
    return res.json({ success: true, message: 'Users loaded', data });
  } catch (error) {
    return next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const user = await createUser(req.user, parse(createUserSchema, req.body), req.tenantId);
    return res.status(201).json({ success: true, message: 'User created', data: { user } });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const user = await updateUser(req.user, req.params.id, parse(updateUserSchema, req.body), req.tenantId);
    if (!user) throw notFound();
    return res.json({ success: true, message: 'User updated', data: { user } });
  } catch (error) {
    return next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const user = await updateUserRole(req.user, req.params.id, parse(updateRoleSchema, req.body).role, req.tenantId);
    if (!user) throw notFound();
    return res.json({ success: true, message: 'User role updated', data: { user } });
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const user = await deactivateUser(req.user, req.params.id, req.tenantId);
    if (!user) throw notFound();
    return res.json({ success: true, message: 'User deactivated', data: { user } });
  } catch (error) {
    return next(error);
  }
};

export const getRoles = (req, res) => res.json({
  success: true,
  message: 'Roles loaded',
  data: { roles: SYSTEM_ROLES.map((role) => ({ role, permissions: getRolePermissions(role) })) },
});
