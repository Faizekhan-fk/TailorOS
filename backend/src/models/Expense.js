import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  expenseNumber: { type: String, required: true, trim: true },
  category: { type: String, enum: ['rent', 'utilities', 'payroll', 'supplies', 'maintenance', 'transport', 'marketing', 'other'], required: true },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  amount: { type: Number, required: true, min: 0.01 },
  status: { type: String, enum: ['POSTED', 'VOID'], default: 'POSTED' },
  spentAt: { type: Date, required: true, default: Date.now },
  paymentMethod: { type: String, enum: ['cash', 'card', 'online', 'check', 'bank_transfer', 'other'], required: true },
  reference: { type: String, trim: true, maxlength: 120 },
  notes: { type: String, trim: true, maxlength: 2000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

expenseSchema.index({ shopId: 1, expenseNumber: 1 }, { unique: true });
expenseSchema.index({ shopId: 1, spentAt: -1, category: 1 });
export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
