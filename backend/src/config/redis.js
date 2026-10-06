import { createClient } from 'redis';
import { config } from './env.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
      db: config.REDIS_DB,
    });
    
    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    redisClient.on('ready', () => console.log('✓ Redis connected'));
    
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('⚠ Redis connection failed (continuing without cache):', error.message);
    return null;
  }
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

export const getRedis = () => redisClient;

export default redisClient;
