import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  },
  { timestamps: true }
);

const Shop = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
export default Shop;
