import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  HOST: process.env.HOST || '0.0.0.0',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/tailoros',
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_DB: process.env.REDIS_DB || 0,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret-change-in-production',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 12),
  
  // CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost,http://localhost:5173',
  REFRESH_COOKIE_NAME: 'refreshToken',
  
  // App
  APP_NAME: 'TailorOS',
  APP_VERSION: '0.1.0',
};

export default config;
