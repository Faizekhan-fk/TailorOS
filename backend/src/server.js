import app from './app.js';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import { assertProductionConfig, config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import User from './models/User.js';
import Shop from './models/Shop.js';
import { normalizeRole } from './config/rolePermissions.js';
import { setSocketServer, closeSocketServer } from './services/realtime.js';
import { startQueueWorkers, closeQueueWorkers } from './services/queueWorker.js';
import { closeBusinessEventQueue } from './services/businessEvents.js';
import { disconnectRedis } from './config/redis.js';
import { disconnectDatabase } from './config/database.js';
import { startWhatsAppWorker, closeWhatsAppWorker } from './services/whatsappWorker.js';
import { closeWhatsAppQueue } from './services/whatsapp.js';

assertProductionConfig();

const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: String(config.CORS_ORIGIN).split(',').map((origin) => origin.trim()),
    credentials: true,
  },
});
setSocketServer(io);

io.use(async (socket, next) => {
  let payload;
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch {
    return next(new Error('Invalid or expired access token'));
  }
  if (payload.tokenType || !payload.userId) return next(new Error('Invalid access token'));
  try {
    const user = await User.findById(payload.userId).select('_id role shopId shop status isActive');
    if (!user || user.status === 'INACTIVE' || user.isActive === false) return next(new Error('User account is inactive'));
    let shopId = user.shopId || user.shop;
    if (normalizeRole(user.role) === 'SUPER_ADMIN') {
      shopId = socket.handshake.auth?.shopId || null;
      if (shopId && !(await Shop.exists({ _id: shopId, status: 'ACTIVE' }))) return next(new Error('Invalid shop context'));
    }
    if (!shopId) return next(new Error('Shop context is required'));
    socket.data.userId = String(user._id);
    socket.data.shopId = String(shopId);
    socket.join(`shop:${shopId}`);
    socket.join(`user:${user._id}`);
    next();
  } catch (error) {
    next(error);
  }
});

io.on('connection', (socket) => {
  socket.emit('realtime:ready', { shopId: socket.data.shopId });
});

const startServer = async () => {
  await connectDatabase();
  await connectRedis();
  startQueueWorkers();
  startWhatsAppWorker();
  httpServer.listen(config.PORT, config.HOST, () => {
    console.log(`\n✓ ${config.APP_NAME} API v${config.APP_VERSION} running`);
    console.log(`✓ Environment: ${config.NODE_ENV}`);
    console.log(`✓ Server: http://${config.HOST}:${config.PORT}`);
    console.log(`✓ Endpoints: http://localhost:${config.PORT}/health\n`);
  });
};

const shutdown = async (signal) => {
  console.log(`\n✓ Received ${signal}; shutting down gracefully...`);
  httpServer.close();
  await closeQueueWorkers();
  await closeBusinessEventQueue();
  await closeWhatsAppWorker();
  await closeWhatsAppQueue();
  await closeSocketServer();
  await disconnectRedis();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGINT', () => { shutdown('SIGINT').catch((error) => { console.error('Shutdown failed:', error); process.exit(1); }); });
process.on('SIGTERM', () => { shutdown('SIGTERM').catch((error) => { console.error('Shutdown failed:', error); process.exit(1); }); });

startServer();
