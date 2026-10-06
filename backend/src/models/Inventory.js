import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['fabric', 'thread', 'button', 'zipper', 'other'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      enum: ['meter', 'piece', 'box', 'kg', 'liter'],
      required: true,
    },
    reorderLevel: {
      type: Number,
      default: 10,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    lastRestocked: Date,
    notes: String,
  },
  { timestamps: true }
);

inventorySchema.index({ shopId: 1, name: 1 });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
