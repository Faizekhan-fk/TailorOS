import crypto from 'node:crypto';
import AuditLog from '../models/AuditLog.js';

const ignoredPaths = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/portal/auth/login'];

export const auditTrail = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || ignoredPaths.some((part) => req.path.endsWith(part))) {
    return next();
  }
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.once('finish', () => {
    if (!req.user && !req.tenantId) return;
    const parts = req.originalUrl.split('?')[0].split('/').filter(Boolean);
    const resource = parts[0] === 'api' && parts[1] === 'v1'
      ? parts[2] || 'unknown'
      : parts[0] === 'api'
        ? parts[1] || 'unknown'
        : parts[0] || 'unknown';
    const record = {
      shopId: req.tenantId || req.user?.shopId || null,
      actorId: req.user?.userId || null,
      actorRole: req.user?.role || 'CUSTOMER_PORTAL',
      action: `${req.method.toLowerCase()}:${resource}`,
      resource,
      resourceId: req.params?.id || req.params?.orderId || req.params?.customerId || undefined,
      method: req.method,
      path: req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path,
      statusCode: res.statusCode,
      requestId,
    };
    AuditLog.create(record).catch((error) => console.error('Audit record write failed:', error));
  });
  next();
};
