import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    paymentTerms: String,
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,
  },
  { timestamps: true }
);

supplierSchema.index({ shopId: 1, phone: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;
