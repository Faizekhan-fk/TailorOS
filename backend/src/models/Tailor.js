import mongoose from 'mongoose';

const tailorSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    specialization: [String],
    experience: Number,
    completedOrders: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 5,
    },
    averageCompletionTime: {
      type: Number,
      default: 0,
    },
    currentWorkload: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
    },
  },
  { timestamps: true }
);

tailorSchema.index({ shopId: 1, user: 1 }, { unique: true, partialFilterExpression: { shopId: { $exists: true, $type: 'objectId' } } });

const Tailor = mongoose.model('Tailor', tailorSchema);
export default Tailor;
