import mongoose from 'mongoose';

const whatsAppMessageSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  templateName: { type: String, required: true },
  recipientMasked: { type: String, required: true },
  providerMessageId: { type: String, default: null, index: true },
  status: { type: String, enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'], default: 'QUEUED', index: true },
  failureCode: { type: String, default: null },
  statusUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

whatsAppMessageSchema.index({ shopId: 1, createdAt: -1 });
whatsAppMessageSchema.index({ shopId: 1, providerMessageId: 1 }, { sparse: true });

export default mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
