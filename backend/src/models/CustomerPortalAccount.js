import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

const portalAccountSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

portalAccountSchema.index({ shopId: 1, customerId: 1 }, { unique: true });
portalAccountSchema.index({ shopId: 1, email: 1 }, { unique: true });
portalAccountSchema.pre('save', async function hashPortalPassword() {
  if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, config.BCRYPT_ROUNDS);
  }
});
portalAccountSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};
export default mongoose.models.CustomerPortalAccount
  || mongoose.model('CustomerPortalAccount', portalAccountSchema);
