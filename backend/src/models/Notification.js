import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  type: { type: String, required: true, trim: true, maxlength: 80 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  resourceType: { type: String, trim: true, maxlength: 80 },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });

notificationSchema.index({ shopId: 1, recipient: 1, createdAt: -1 });
export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
