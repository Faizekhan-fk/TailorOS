import express from 'express';
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

const app = express();

// Trust the single Nginx reverse-proxy hop for client IP handling.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = new Set(
  String(config.CORS_ORIGIN || 'http://localhost,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(['http://localhost', 'http://localhost:5173', 'http://127.0.0.1', 'http://127.0.0.1:5173'])
);

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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

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
}

// Health check for Docker
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

