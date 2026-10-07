import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';

const tokenClaims = (user) => ({
  userId: String(user._id || user.id),
});

export const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateAccessToken = (user) =>
  jwt.sign(tokenClaims(user), config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  });

export const generateRefreshToken = (user) =>
  jwt.sign({ ...tokenClaims(user), tokenType: 'refresh', jti: crypto.randomUUID() }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });

export const generateTokens = (user) => ({
  accessToken: generateAccessToken(user),
  refreshToken: generateRefreshToken(user),
});

export const verifyAccessToken = (token) => {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    return payload.tokenType ? null : payload;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET);
    return payload.tokenType === 'refresh' ? payload : null;
  } catch {
    return null;
  }
};

// Backwards-compatible names used by the existing middleware.
export const verifyToken = verifyAccessToken;
export const decodeToken = (token) => jwt.decode(token);
