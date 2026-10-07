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
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  
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
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET || '',
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
  WHATSAPP_ORDER_UPDATE_TEMPLATE: process.env.WHATSAPP_ORDER_UPDATE_TEMPLATE || '',
  WHATSAPP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
  WHATSAPP_GRAPH_API_VERSION: process.env.WHATSAPP_GRAPH_API_VERSION || 'v22.0',
  BARCODE_SIGNING_SECRET: process.env.BARCODE_SIGNING_SECRET || process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  
  // App
  APP_NAME: 'TailorOS',
  APP_VERSION: '0.1.0',
};

export const assertProductionConfig = (environment = config) => {
  if (environment.NODE_ENV !== 'production') return;
  const issues = [];
  if (environment.JWT_SECRET.length < 32 || environment.JWT_SECRET.includes('change-in-production')) {
    issues.push('JWT_SECRET must be a unique random secret of at least 32 characters');
  }
  if (environment.JWT_REFRESH_SECRET.length < 32
    || environment.JWT_REFRESH_SECRET.includes('change-in-production')
    || environment.JWT_REFRESH_SECRET === environment.JWT_SECRET) {
    issues.push('JWT_REFRESH_SECRET must be a unique random secret of at least 32 characters');
  }
  if (environment.BARCODE_SIGNING_SECRET.length < 32 || environment.BARCODE_SIGNING_SECRET.includes('change-in-production')) {
    issues.push('BARCODE_SIGNING_SECRET must be a unique random secret of at least 32 characters');
  }
  const secretValues = [
    environment.JWT_SECRET,
    environment.JWT_REFRESH_SECRET,
    environment.BARCODE_SIGNING_SECRET,
    environment.REDIS_PASSWORD,
  ];
  if (new Set(secretValues).size !== secretValues.length) {
    issues.push('JWT, Redis, and barcode signing secrets must be different');
  }
  if (!environment.MONGODB_URI.startsWith('mongodb://') && !environment.MONGODB_URI.startsWith('mongodb+srv://')) {
    issues.push('MONGODB_URI must be a valid MongoDB URI');
  }
  if (!environment.MONGODB_URI.includes('@')) issues.push('MONGODB_URI must authenticate to MongoDB in production');
  if (!environment.REDIS_PASSWORD) issues.push('REDIS_PASSWORD must be set in production');
  if (environment.CORS_ORIGIN.split(',').some((origin) => !origin.startsWith('https://'))) {
    issues.push('CORS_ORIGIN must contain only HTTPS origins in production');
  }
  if (issues.length) throw new Error(`Invalid production configuration: ${issues.join('; ')}`);
};

export default config;
