import mongoose from 'mongoose';

const measurementProfileSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'MeasurementTemplate', required: true },
    version: { type: Number, required: true, min: 1 },
    values: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    isCurrent: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

measurementProfileSchema.index({ shopId: 1, customerId: 1, version: 1 }, { unique: true });
measurementProfileSchema.index({ shopId: 1, customerId: 1, isCurrent: 1 });

const MeasurementProfile = mongoose.models.MeasurementProfile
  || mongoose.model('MeasurementProfile', measurementProfileSchema);

export default MeasurementProfile;
