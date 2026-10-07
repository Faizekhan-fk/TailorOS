import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyWhatsAppSignature } from '../src/services/whatsapp.js';
import { assertProductionConfig } from '../src/config/env.js';

test('WhatsApp webhook signatures are checked against the exact request bytes', () => {
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const secret = 'unit-test-app-secret';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  assert.equal(verifyWhatsAppSignature(body, signature, secret), true);
  assert.equal(verifyWhatsAppSignature(Buffer.from(`${body.toString()} `), signature, secret), false);
  assert.equal(verifyWhatsAppSignature(body, 'sha256=invalid', secret), false);
  assert.equal(verifyWhatsAppSignature(null, signature, secret), false);
});

test('production configuration requires authenticated databases and independent strong secrets', () => {
  const base = {
    NODE_ENV: 'production',
    JWT_SECRET: 'a'.repeat(48),
    JWT_REFRESH_SECRET: 'b'.repeat(48),
    BARCODE_SIGNING_SECRET: 'c'.repeat(48),
    MONGODB_URI: 'mongodb://user:password@db:27017/tailoros',
    REDIS_PASSWORD: 'redis-password',
    CORS_ORIGIN: 'https://tailoros.example',
  };
  assert.doesNotThrow(() => assertProductionConfig(base));
  assert.throws(() => assertProductionConfig({ ...base, BARCODE_SIGNING_SECRET: base.JWT_SECRET }), /secrets must be different/);
  assert.throws(() => assertProductionConfig({ ...base, CORS_ORIGIN: 'http://tailoros.example' }), /HTTPS origins/);
  assert.throws(() => assertProductionConfig({ ...base, JWT_REFRESH_SECRET: base.JWT_SECRET }), /JWT_REFRESH_SECRET/);
  assert.throws(() => assertProductionConfig({ ...base, MONGODB_URI: 'mongodb://db:27017/tailoros' }), /authenticate to MongoDB/);
});
