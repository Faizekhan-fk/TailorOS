import { Worker } from 'bullmq';
import { config } from '../config/env.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import { emitShopEvent } from './realtime.js';

let worker;

export const startWhatsAppWorker = () => {
  worker = new Worker('whatsapp-messages', async (job) => {
    if (job.name !== 'send-template') throw new Error(`Unsupported WhatsApp job: ${job.name}`);
    const { shopId, customerId, orderId, messageId, parameters } = job.data;
    const customer = await Customer.findOne({ _id: customerId, shopId, whatsappOptIn: true, deletedAt: null });
    const log = await WhatsAppMessage.findOne({ _id: messageId, shopId });
    if (!customer || !log) {
      if (log) {
        log.status = 'FAILED';
        log.failureCode = 'CONSENT_REVOKED_OR_CUSTOMER_UNAVAILABLE';
        log.statusUpdatedAt = new Date();
        await log.save();
      }
      return { skipped: true };
    }
    if (orderId && !(await Order.exists({ _id: orderId, shopId, customer: customerId }))) {
      throw new Error('Order is no longer available for the customer');
    }

    const phone = String(customer.whatsapp || customer.phone || '').replace(/[^\d]/g, '');
    if (phone.length < 8 || phone.length > 15) throw new Error('Customer WhatsApp number must use international digits');
    const response = await fetch(`https://graph.facebook.com/${config.WHATSAPP_GRAPH_API_VERSION}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: log.templateName,
          language: { code: config.WHATSAPP_TEMPLATE_LANGUAGE },
          ...(parameters.length ? {
            components: [{ type: 'body', parameters: parameters.map((text) => ({ type: 'text', text })) }],
          } : {}),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`WhatsApp provider request failed with HTTP ${response.status}`);
      error.code = result.error?.code ? String(result.error.code) : 'WHATSAPP_PROVIDER_ERROR';
      throw error;
    }
    const providerMessageId = result.messages?.[0]?.id;
    if (!providerMessageId) throw new Error('WhatsApp provider returned no message identifier');
    log.providerMessageId = providerMessageId;
    log.status = 'SENT';
    log.failureCode = null;
    log.statusUpdatedAt = new Date();
    await log.save();
    emitShopEvent(shopId, 'whatsapp:status', { messageId: String(log._id), status: log.status });
    return { providerMessageId };
  }, {
    connection: {
      host: config.REDIS_HOST,
      port: Number(config.REDIS_PORT),
      db: Number(config.REDIS_DB),
      ...(config.REDIS_PASSWORD ? { password: config.REDIS_PASSWORD } : {}),
      maxRetriesPerRequest: null,
    },
    concurrency: 3,
  });
  worker.on('failed', async (job, error) => {
    console.error(`WhatsApp message job ${job?.id || 'unknown'} failed:`, error);
    if (job?.data?.messageId && job.attemptsMade >= (job.opts?.attempts || 1)) {
      await WhatsAppMessage.updateOne(
        { _id: job.data.messageId, status: { $in: ['QUEUED', 'SENT'] } },
        { $set: { status: 'FAILED', failureCode: String(error.code || 'DELIVERY_FAILED').slice(0, 80), statusUpdatedAt: new Date() } }
      );
    }
  });
  return worker;
};

export const closeWhatsAppWorker = async () => {
  if (!worker) return;
  await worker.close();
  worker = null;
};
