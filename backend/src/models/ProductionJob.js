import mongoose from 'mongoose';

const productionJobSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderItemIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    garmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Garment',
      default: null,
    },
    garmentName: { type: String, trim: true, required: true },
    quantity: { type: Number, required: true, min: 1 },
    stage: {
      type: String,
      enum: ['queued', 'cutting', 'sewing', 'fitting', 'finishing', 'quality_check', 'ready', 'blocked', 'cancelled'],
      default: 'queued',
      required: true,
    },
    blockedFromStage: {
      type: String,
      enum: ['queued', 'cutting', 'sewing', 'fitting', 'finishing', 'quality_check', 'ready'],
      default: null,
    },
    assignedTailor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tailor',
      default: null,
    },
    dueDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 2000 },
    startedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

productionJobSchema.index({ shopId: 1, orderId: 1, orderItemIndex: 1 }, { unique: true });
productionJobSchema.index({ shopId: 1, stage: 1, dueDate: 1 });
productionJobSchema.index({ shopId: 1, assignedTailor: 1, stage: 1 });

const ProductionJob = mongoose.models.ProductionJob
  || mongoose.model('ProductionJob', productionJobSchema);
export default ProductionJob;
