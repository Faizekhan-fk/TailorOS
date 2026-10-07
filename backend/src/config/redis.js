import { createClient } from 'redis';
import { config } from './env.js';

let redisClient = null;

export const connectRedis = async () => {
  if (redisClient?.isReady) return redisClient;
  redisClient = createClient({
    socket: {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      ...(config.REDIS_PASSWORD ? { password: config.REDIS_PASSWORD } : {}),
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
    database: config.REDIS_DB,
  });
  redisClient.on('error', (error) => console.error('Redis client error:', error));
  redisClient.on('ready', () => console.log('✓ Redis connected'));
  await redisClient.connect();
  return redisClient;
};

export const disconnectRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.disconnect();
      console.log('✓ Redis disconnected');
    } catch (error) {
      console.error('✗ Redis disconnection failed:', error.message);
    }
  }
};

export const getRedis = () => {
  if (!redisClient?.isReady) {
    const error = new Error('Redis is unavailable');
    error.status = 503;
    throw error;
  }
  return redisClient;
};

export const isRedisReady = () => Boolean(redisClient?.isReady);

export default redisClient;
