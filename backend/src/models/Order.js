import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    items: [
      {
        garment: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Garment',
        },
        quantity: Number,
        price: Number,
        notes: String,
        measurementProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementProfile' },
        measurementSnapshot: {
          profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementProfile' },
          version: { type: Number, min: 1 },
          templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementTemplate' },
          values: { type: Map, of: mongoose.Schema.Types.Mixed },
          capturedAt: { type: Date },
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'ready', 'delivered', 'cancelled'],
      default: 'pending',
    },
    deliveryDate: Date,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    payment: {
      method: {
        type: String,
        enum: ['cash', 'card', 'online', 'check'],
      },
      status: {
        type: String,
        enum: ['pending', 'partial', 'paid'],
        default: 'pending',
      },
      paidAmount: {
        type: Number,
        default: 0,
      },
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

orderSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });



const Order = mongoose.model('Order', orderSchema);
export default Order;
