import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  invoiceNumber: { type: String, required: true, trim: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  }],
  subtotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ['ISSUED', 'PAID', 'VOID'], default: 'ISSUED' },
  issuedAt: { type: Date, default: Date.now },
  dueAt: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 2000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

invoiceSchema.index({ shopId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ shopId: 1, orderId: 1 }, { unique: true });
invoiceSchema.index({ shopId: 1, status: 1, issuedAt: -1 });
export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
