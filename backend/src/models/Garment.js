import mongoose from 'mongoose';

const garmentSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Garment name is required'],
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['shirt', 'pants', 'dress', 'suit', 'jacket', 'skirt', 'other'],
      required: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: 0,
    },
    estimatedDays: {
      type: Number,
      default: 7,
    },
    materials: [
      {
        name: String,
        quantity: Number,
        unit: String,
      },
    ],
    specifications: {
      type: Map,
      of: String,
    },
    image: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

garmentSchema.index({ shopId: 1, name: 1 }, { unique: true });

const Garment = mongoose.model('Garment', garmentSchema);
export default Garment;
