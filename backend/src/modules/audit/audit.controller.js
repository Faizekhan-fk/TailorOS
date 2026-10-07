import AuditLog from '../../models/AuditLog.js';
import { scopedFilter } from '../../middleware/tenant.js';

export const listAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const query = scopedFilter(req);
    if (req.query.actorId) query.actorId = req.query.actorId;
    if (req.query.resource) query.resource = String(req.query.resource).slice(0, 80);
    if (req.query.from || req.query.to) {
      const from = req.query.from ? new Date(req.query.from) : null;
      const to = req.query.to ? new Date(req.query.to) : null;
      if ((from && Number.isNaN(from.valueOf())) || (to && Number.isNaN(to.valueOf()))) {
        return res.status(400).json({ success: false, message: 'Invalid date filter', errors: [] });
      }
      query.occurredAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(query).populate('actorId', 'name email role')
        .sort({ occurredAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);
    res.json({ success: true, logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};
