import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorRole: { type: String, trim: true },
  action: { type: String, required: true, trim: true },
  resource: { type: String, required: true, trim: true },
  resourceId: { type: String, trim: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  requestId: { type: String, trim: true },
  occurredAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });

auditLogSchema.index({ shopId: 1, occurredAt: -1 });
auditLogSchema.index({ actorId: 1, occurredAt: -1 });
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function rejectMutation() {
  throw new Error('Audit logs are immutable');
});
export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
