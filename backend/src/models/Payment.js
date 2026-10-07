import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    type: {
      type: String,
      enum: ['PAYMENT', 'REFUND'],
      required: true,
      default: 'PAYMENT',
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'online', 'check', 'bank_transfer', 'other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['POSTED', 'VOID'],
      default: 'POSTED',
      required: true,
    },
    reference: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 1000 },
    originalPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    refundedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paidAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ shopId: 1, receiptNumber: 1 }, { unique: true });
paymentSchema.index({ shopId: 1, orderId: 1, createdAt: -1 });
paymentSchema.index({ shopId: 1, customerId: 1, createdAt: -1 });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
export default Payment;
