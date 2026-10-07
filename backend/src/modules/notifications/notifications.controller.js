import mongoose from 'mongoose';
import { z } from 'zod';
import Notification from '../../models/Notification.js';
import { scopedFilter } from '../../middleware/tenant.js';
import { publishBusinessEvent } from '../../services/businessEvents.js';

export const listNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const query = scopedFilter(req, { $or: [{ recipient: req.user.userId }, { recipient: null }] });
    if (req.query.unread === 'true') query.readBy = { $ne: req.user.userId };
    const [notifications, total, unread] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments(scopedFilter(req, {
        readBy: { $ne: req.user.userId },
        $or: [{ recipient: req.user.userId }, { recipient: null }],
      })),
    ]);
    const serialized = notifications.map((notification) => ({
      ...notification,
      readAt: notification.readBy?.some((id) => String(id) === String(req.user.userId)) ? new Date().toISOString() : null,
    }));
    res.json({ success: true, notifications: serialized, unread, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const markRead = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Notification not found', errors: [] });
    const notification = await Notification.findOneAndUpdate(
      scopedFilter(req, {
        _id: req.params.id,
        $or: [{ recipient: req.user.userId }, { recipient: null }],
      }),
      { $addToSet: { readBy: req.user.userId } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found', errors: [] });
    res.json({ success: true, notification });
  } catch (error) { next(error); }
};

export const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      scopedFilter(req, { readBy: { $ne: req.user.userId }, $or: [{ recipient: req.user.userId }, { recipient: null }] }),
      { $addToSet: { readBy: req.user.userId } }
    );
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) { next(error); }
};

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(160),
  message: z.string().trim().min(2).max(1000),
  recipient: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict();

export const createAnnouncement = async (req, res, next) => {
  try {
    const input = announcementSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ success: false, message: 'Validation failed', errors: input.error.issues });
    await publishBusinessEvent({
      shopId: req.tenantId,
      recipient: input.data.recipient,
      type: 'announcement',
      title: input.data.title,
      message: input.data.message,
      resourceType: 'announcement',
    });
    res.status(202).json({ success: true, message: 'Announcement queued for delivery' });
  } catch (error) { next(error); }
};
