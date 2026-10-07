import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unitPrice: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0, min: 0 },
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  purchaseNumber: { type: String, required: true, trim: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: { type: [purchaseItemSchema], required: true, validate: [(items) => items.length > 0, 'At least one item is required'] },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['ORDERED', 'RECEIVING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'], default: 'ORDERED' },
  orderedAt: { type: Date, default: Date.now },
  receivedAt: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 2000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

purchaseSchema.index({ shopId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ shopId: 1, status: 1, orderedAt: -1 });
export default mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
