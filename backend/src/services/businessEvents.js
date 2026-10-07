import { Queue } from 'bullmq';
import { config } from '../config/env.js';
import { getRedis } from '../config/redis.js';

let notificationQueue;

const getNotificationQueue = () => {
  if (!notificationQueue) {
    notificationQueue = new Queue('business-notifications', {
      connection: {
        host: config.REDIS_HOST,
        port: Number(config.REDIS_PORT),
        db: Number(config.REDIS_DB),
        ...(config.REDIS_PASSWORD ? { password: config.REDIS_PASSWORD } : {}),
        maxRetriesPerRequest: null,
      },
    });
  }
  return notificationQueue;
};

export const publishBusinessEvent = async (event) => {
  try {
    getRedis();
    await getNotificationQueue().add('notify-shop', {
      shopId: String(event.shopId),
      type: event.type,
      title: event.title,
      message: event.message,
      resourceType: event.resourceType,
      resourceId: event.resourceId ? String(event.resourceId) : null,
      recipient: event.recipient ? String(event.recipient) : null,
    }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return true;
  } catch (error) {
    console.error('Business notification could not be queued:', error);
    return false;
  }
};

export const closeBusinessEventQueue = async () => {
  if (!notificationQueue) return;
  await notificationQueue.close();
  notificationQueue = null;
};
