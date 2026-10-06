import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import Shop from '../../models/Shop.js';
import { config } from '../../config/env.js';
import { getRolePermissions, normalizeRole } from '../../config/rolePermissions.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from '../../utils/tokenManager.js';

const getUserName = (user) => user.name || [user.firstName, user.lastName].filter(Boolean).join(' ');

export const publicUser = (user) => ({
  id: String(user._id),
  name: getUserName(user),
  email: user.email,
  phone: user.phone || null,
  role: normalizeRole(user.role),
  permissions: getRolePermissions(user.role),
  shopId: user.shopId || user.shop || null,
  status: user.status || (user.isActive === false ? 'INACTIVE' : 'ACTIVE'),
  lastLoginAt: user.lastLoginAt || user.lastLogin || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const refreshExpiry = (refreshToken) => {
  const payload = jwt.decode(refreshToken);
  return payload?.exp ? new Date(payload.exp * 1000) : null;
};

export const setRefreshCookie = (res, refreshToken) => {
  res.cookie(config.REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(config.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
};

const createSession = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashRefreshToken(refreshToken);
  user.refreshTokenExpiresAt = refreshExpiry(refreshToken);
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

export const registerUser = async ({ name, email, password, phone }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.status = 409;
    throw error;
  }

  const shop = await Shop.create({ name: `${name.trim()}'s Shop` });
  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone || undefined,
    passwordHash: password,
    role: 'SHOP_OWNER',
    shopId: shop._id,
    status: 'ACTIVE',
    isActive: true,
  });
  await user.save();
  return { user, session: await createSession(user) };
};

export const authenticateUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select('+passwordHash +password +refreshTokenHash +refreshTokenExpiresAt');

  if (!user || !(await user.comparePassword(password))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const isInactive = user.status === 'INACTIVE' || user.isActive === false;
  if (isInactive) {
    const error = new Error('User account is inactive');
    error.status = 403;
    throw error;
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    const error = new Error('Account temporarily locked. Try again later.');
    error.status = 423;
    throw error;
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  user.lastLogin = user.lastLoginAt;
  const session = await createSession(user);
  return { user, session };
};

export const refreshSession = async (refreshToken) => {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    const error = new Error('Invalid or expired refresh token');
    error.status = 401;
    throw error;
  }

  const user = await User.findById(payload.userId).select('+refreshTokenHash +refreshTokenExpiresAt');
  const matches = user?.refreshTokenHash === hashRefreshToken(refreshToken);
  const notExpired = user?.refreshTokenExpiresAt && user.refreshTokenExpiresAt > new Date();
  const isInactive = !user || user.status === 'INACTIVE' || user.isActive === false;
  if (!matches || !notExpired || isInactive) {
    const error = new Error('Invalid or expired refresh token');
    error.status = 401;
    throw error;
  }

  return { user, session: await createSession(user) };
};

export const revokeSession = async (refreshToken) => {
  if (!refreshToken) return;
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return;
  await User.findByIdAndUpdate(payload.userId, {
    $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 },
  });
};

export const getUserById = (id) => User.findById(id);

export const updateUserPassword = async (user, newPassword) => {
  user.passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
  user.refreshTokenHash = undefined;
  user.refreshTokenExpiresAt = undefined;
  await user.save();
};
