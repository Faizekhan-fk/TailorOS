import User from '../../models/User.js';
import { publicUser } from '../auth/auth.service.js';
import { getRolePermissions, normalizeRole, SYSTEM_ROLES } from '../../config/rolePermissions.js';

const scopeFor = (requestUser, tenantId) => {
  if (normalizeRole(requestUser.role) === 'SUPER_ADMIN') return tenantId ? { shopId: tenantId } : {};
  return { shopId: requestUser.shopId || null };
};

export const listUsers = async (requestUser, query, tenantId) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const filter = scopeFor(requestUser, tenantId);
  if (query.status) filter.status = query.status;
  if (query.search) filter.$or = [
    { name: { $regex: query.search, $options: 'i' } },
    { email: { $regex: query.search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  return { users: users.map(publicUser), pagination: { page, limit, total } };
};

export const createUser = async (requestUser, input, tenantId) => {
  const role = input.role || 'RECEPTIONIST';
  if (role === 'SUPER_ADMIN' && normalizeRole(requestUser.role) !== 'SUPER_ADMIN') {
    const error = new Error('Only a super administrator can create super administrators');
    error.status = 403;
    throw error;
  }

  const email = input.email.trim().toLowerCase();
  if (await User.exists({ email })) {
    const error = new Error('Email is already registered');
    error.status = 409;
    throw error;
  }

  const user = await User.create({
    name: input.name,
    email,
    phone: input.phone || undefined,
    passwordHash: input.password,
    role,
    shopId: tenantId || requestUser.shopId || undefined,
    status: 'ACTIVE',
    isActive: true,
  });
  return publicUser(user);
};

export const findScopedUser = (requestUser, id, tenantId) => User.findOne({ _id: id, ...scopeFor(requestUser, tenantId) });

export const updateUser = async (requestUser, id, input, tenantId) => {
  const user = await findScopedUser(requestUser, id, tenantId);
  if (!user) return null;
  Object.assign(user, input);
  if (input.status) user.isActive = input.status === 'ACTIVE';
  await user.save();
  return publicUser(user);
};

export const updateUserRole = async (requestUser, id, role, tenantId) => {
  if (role === 'SUPER_ADMIN' && normalizeRole(requestUser.role) !== 'SUPER_ADMIN') {
    const error = new Error('Only a super administrator can assign the super administrator role');
    error.status = 403;
    throw error;
  }
  const user = await findScopedUser(requestUser, id, tenantId);
  if (!user) return null;
  user.role = role;
  await user.save({ validateBeforeSave: false });
  return publicUser(user);
};

export const deactivateUser = async (requestUser, id, tenantId) => {
  const user = await findScopedUser(requestUser, id, tenantId);
  if (!user) return null;
  user.status = 'INACTIVE';
  user.isActive = false;
  user.refreshTokenHash = undefined;
  user.refreshTokenExpiresAt = undefined;
  await user.save({ validateBeforeSave: false });
  return publicUser(user);
};

export const listRoles = () => SYSTEM_ROLES.map((role) => ({ role, permissions: getRolePermissions(role) }));
