import express from 'express';
import mongoose from 'mongoose';
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

// Import routes
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import garmentRoutes from './modules/garments/garments.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import suppliersRoutes from './modules/suppliers/suppliers.routes.js';
import tailorsRoutes from './modules/tailors/tailors.routes.js';
import usersRoutes from './modules/users/user.routes.js';
import measurementsRoutes from './modules/measurements/measurement.routes.js';
import shopsRoutes from './modules/shops/shops.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import productionRoutes from './modules/production/production.routes.js';
import purchasesRoutes from './modules/purchases/purchases.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import customerPortalRoutes from './modules/customer-portal/customerPortal.routes.js';
import whatsAppRoutes from './modules/whatsapp/whatsapp.routes.js';
import barcodeRoutes from './modules/barcodes/barcodes.routes.js';
import { auditTrail } from './services/auditTrail.js';
import { isRedisReady } from './config/redis.js';

const app = express();

// Trust the single Nginx reverse-proxy hop for client IP handling.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.disable('x-powered-by');

// CORS
const configuredOrigins = String(config.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = new Set(configuredOrigins.concat(config.NODE_ENV === 'production' ? [] : [
  'http://localhost', 'http://localhost:5173', 'http://127.0.0.1', 'http://127.0.0.1:5173',
]));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shop-Id'],
}));

// Body parser
app.use(express.json({
  limit: '1mb',
  verify(req, res, buffer) {
    req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(auditTrail);

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/v1/customer-portal/auth/login', authLimiter);
app.use('/api/customer-portal/auth/login', authLimiter);

// Routes. Keep /api as a backwards-compatible alias while /api/v1 is the
// public versioned API used by the application and reverse proxy.
const apiPrefixes = ['/api/v1', '/api'];

for (const prefix of apiPrefixes) {
  app.use(`${prefix}/health`, healthRoutes);
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/customers`, customersRoutes);
  app.use(`${prefix}/garments`, garmentRoutes);
  app.use(`${prefix}/orders`, ordersRoutes);
  app.use(`${prefix}/inventory`, inventoryRoutes);
  app.use(`${prefix}/suppliers`, suppliersRoutes);
  app.use(`${prefix}/tailors`, tailorsRoutes);
  app.use(`${prefix}/users`, usersRoutes);
  app.use(`${prefix}/measurements`, measurementsRoutes);
  app.use(`${prefix}/shops`, shopsRoutes);
  app.use(`${prefix}/payments`, paymentsRoutes);
  app.use(`${prefix}/production`, productionRoutes);
  app.use(`${prefix}/purchases`, purchasesRoutes);
  app.use(`${prefix}/expenses`, expensesRoutes);
  app.use(`${prefix}/invoices`, invoicesRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
  app.use(`${prefix}/reports`, reportsRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/audit-logs`, auditRoutes);
  app.use(`${prefix}/customer-portal`, customerPortalRoutes);
  app.use(`${prefix}/whatsapp`, whatsAppRoutes);
  app.use(`${prefix}/barcodes`, barcodeRoutes);
}

// Health check for Docker
const healthStatus = () => {
  const redis = isRedisReady() ? 'ready' : 'unavailable';
  const database = mongoose.connection.readyState === mongoose.ConnectionStates.connected ? 'ready' : 'unavailable';
  const healthy = redis === 'ready' && database === 'ready';
  return { healthy, payload: { status: healthy ? 'ok' : 'degraded', services: { database, redis }, timestamp: new Date().toISOString() } };
};

app.get('/health', (req, res) => {
  const { payload } = healthStatus();
  res.json({ ...payload, status: 'ok' });
});

app.get('/ready', (req, res) => {
  const { healthy, payload } = healthStatus();
  res.status(healthy ? 200 : 503).json(payload);
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'TailorOS API', version: '0.1.0' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
