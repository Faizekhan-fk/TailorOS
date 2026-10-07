import mongoose from 'mongoose';

const customerCounterSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true,
  },
  sequence: {
    type: Number,
    default: 0,
    min: 0,
  },
});

customerCounterSchema.index({ shopId: 1 }, { unique: true });

const CustomerCounter = mongoose.models.CustomerCounter
  || mongoose.model('CustomerCounter', customerCounterSchema);

export default CustomerCounter;
