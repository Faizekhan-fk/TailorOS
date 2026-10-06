import User from '../../models/User.js';
import {
  authenticateUser,
  clearRefreshCookie,
  getUserById,
  publicUser,
  refreshSession,
  registerUser,
  revokeSession,
  setRefreshCookie,
  updateUserPassword,
} from './auth.service.js';
import {
  changePasswordSchema,
  formatValidationErrors,
  loginSchema,
  profileSchema,
  registerSchema,
} from './auth.validation.js';

const parse = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.status = 400;
    error.errors = formatValidationErrors(result.error);
    throw error;
  }
  return result.data;
};

const sendSession = (res, message, session, user, status = 200) => {
  setRefreshCookie(res, session.refreshToken);
  return res.status(status).json({
    success: true,
    message,
    data: { accessToken: session.accessToken, user: publicUser(user) },
  });
};

export const register = async (req, res, next) => {
  try {
    const input = parse(registerSchema, req.body);
    const name = input.name || `${input.firstName} ${input.lastName}`;
    const result = await registerUser({ ...input, name });
    return sendSession(res, 'User registered successfully', result.session, result.user, 201);
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const input = parse(loginSchema, req.body);
    const result = await authenticateUser(input);
    return sendSession(res, 'Login successful', result.session, result.user);
  } catch (error) {
    return next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      const error = new Error('Refresh token is required');
      error.status = 401;
      throw error;
    }
    const result = await refreshSession(refreshToken);
    return sendSession(res, 'Token refreshed successfully', result.session, result.user);
  } catch (error) {
    clearRefreshCookie(res);
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await revokeSession(req.cookies.refreshToken);
    clearRefreshCookie(res);
    return res.json({ success: true, message: 'Logout successful', data: null });
  } catch (error) {
    return next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return res.json({ success: true, message: 'Current user loaded', data: { user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const input = parse(profileSchema, req.body);
    const user = await User.findByIdAndUpdate(req.user.id, input, { new: true, runValidators: true });
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    return res.json({ success: true, message: 'Profile updated successfully', data: { user: publicUser(user) } });
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const input = parse(changePasswordSchema, req.body);
    const user = await User.findById(req.user.id).select('+passwordHash +password');
    if (!user || !(await user.comparePassword(input.currentPassword))) {
      const error = new Error('Current password is incorrect');
      error.status = 401;
      throw error;
    }
    await updateUserPassword(user, input.newPassword);
    clearRefreshCookie(res);
    return res.json({ success: true, message: 'Password changed successfully', data: null });
  } catch (error) {
    return next(error);
  }
};
