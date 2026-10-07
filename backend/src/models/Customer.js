import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    customerNumber: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    whatsapp: { type: String, trim: true },
    whatsappOptIn: { type: Boolean, default: false },
    whatsappOptInAt: { type: Date, default: null },
    whatsappOptInSource: { type: String, trim: true, maxlength: 120 },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    address: { type: mongoose.Schema.Types.Mixed },
    measurementTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementTemplate' },
    currentMeasurementProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementProfile' },
    measurements: { type: Map, of: mongoose.Schema.Types.Mixed, default: () => new Map() },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    notes: String,
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    deletedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

customerSchema.index({ shopId: 1, phone: 1 });
customerSchema.index({ shopId: 1, email: 1 });
customerSchema.index({ shopId: 1, whatsapp: 1 });
customerSchema.index({ shopId: 1, status: 1, createdAt: -1 });
customerSchema.index({ shopId: 1, deletedAt: 1, createdAt: -1 });
customerSchema.index({ shopId: 1, customerNumber: 1 }, { unique: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
