import express from 'express';
import {
  register,
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  updateProfile,
  changePassword,
} from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter, createLimiter } from '../../middleware/rateLimit.js';

const router = express.Router();

// Public routes
router.post('/register', createLimiter, register);
router.post('/login', authLimiter, login);

// Protected routes
router.post('/logout', logout);
router.post('/refresh', authLimiter, refreshAccessToken);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
