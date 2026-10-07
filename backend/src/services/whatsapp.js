import crypto from 'node:crypto';
import { Queue } from 'bullmq';
import { config } from '../config/env.js';
import { isRedisReady } from '../config/redis.js';

let queue;

const getQueue = () => {
  if (!queue) {
    queue = new Queue('whatsapp-messages', {
      connection: {
        host: config.REDIS_HOST,
        port: Number(config.REDIS_PORT),
        db: Number(config.REDIS_DB),
        ...(config.REDIS_PASSWORD ? { password: config.REDIS_PASSWORD } : {}),
        maxRetriesPerRequest: null,
      },
    });
  }
  return queue;
};

export const isWhatsAppConfigured = () => Boolean(
  config.WHATSAPP_ACCESS_TOKEN
  && config.WHATSAPP_PHONE_NUMBER_ID
  && config.WHATSAPP_APP_SECRET
  && config.WHATSAPP_VERIFY_TOKEN
  && config.WHATSAPP_ORDER_UPDATE_TEMPLATE
);

export const enqueueWhatsAppMessage = async (data) => {
  if (!isWhatsAppConfigured()) {
    const error = new Error('WhatsApp Cloud API is not configured');
    error.status = 503;
    throw error;
  }
  if (!isRedisReady()) {
    const error = new Error('Message queue is unavailable');
    error.status = 503;
    throw error;
  }
  await getQueue().add('send-template', data, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
};

export const verifyWhatsAppSignature = (rawBody, signature, appSecret = config.WHATSAPP_APP_SECRET) => {
  if (!Buffer.isBuffer(rawBody) || !signature || !appSecret) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const received = Buffer.from(String(signature));
  const expectedBytes = Buffer.from(expected);
  return received.length === expectedBytes.length && crypto.timingSafeEqual(received, expectedBytes);
};

export const closeWhatsAppQueue = async () => {
  if (!queue) return;
  await queue.close();
  queue = null;
};
