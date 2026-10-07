import { Worker } from 'bullmq';
import { config } from '../config/env.js';
import Notification from '../models/Notification.js';
import { emitRoomEvent } from './realtime.js';

let notificationWorker;

export const startQueueWorkers = () => {
  notificationWorker = new Worker('business-notifications', async (job) => {
    if (job.name !== 'notify-shop') throw new Error(`Unsupported queue task: ${job.name}`);
    const notification = await Notification.create(job.data);
    const payload = notification.toObject();
    const room = job.data.recipient ? `user:${job.data.recipient}` : `shop:${job.data.shopId}`;
    emitRoomEvent(room, 'notification:new', payload);
    emitRoomEvent(room, 'business:event', {
      type: job.data.type,
      resourceType: job.data.resourceType,
      resourceId: job.data.resourceId,
    });
    return { notificationId: String(notification._id) };
  }, {
    connection: {
      host: config.REDIS_HOST,
      port: Number(config.REDIS_PORT),
      db: Number(config.REDIS_DB),
      ...(config.REDIS_PASSWORD ? { password: config.REDIS_PASSWORD } : {}),
      maxRetriesPerRequest: null,
    },
    concurrency: 5,
  });
  notificationWorker.on('failed', (job, error) => {
    console.error(`Notification job ${job?.id || 'unknown'} failed:`, error);
  });
  return notificationWorker;
};

export const closeQueueWorkers = async () => {
  if (!notificationWorker) return;
  await notificationWorker.close();
  notificationWorker = null;
};
