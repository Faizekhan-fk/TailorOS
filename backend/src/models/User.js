import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { SYSTEM_ROLES } from '../config/rolePermissions.js';

const LEGACY_USER_ROLES = [
  'admin',
  'manager',
  'tailor',
  'staff',
];

export const USER_ROLES = [...SYSTEM_ROLES, ...LEGACY_USER_ROLES];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    // Legacy credential field; new writes always use passwordHash.
    password: { type: String, select: false },
    role: { type: String, enum: USER_ROLES, default: 'SHOP_OWNER', index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', index: true },
    // Legacy relationship field retained for existing records.
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    lastLogin: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    refreshTokenHash: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index({ shopId: 1, status: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash') && !this.isModified('password')) return next();

  try {
    const plainPassword = this.passwordHash || this.password;
    if (plainPassword && !plainPassword.startsWith('$2')) {
      this.passwordHash = await bcrypt.hash(plainPassword, config.BCRYPT_ROUNDS);
      this.password = undefined;
    }
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  const storedHash = this.passwordHash || this.password;
  return storedHash ? bcrypt.compare(plainPassword, storedHash) : false;
};

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.password;
  delete user.passwordHash;
  delete user.refreshTokenHash;
  delete user.refreshTokenExpiresAt;
  delete user.failedLoginAttempts;
  delete user.lockUntil;
  return user;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
