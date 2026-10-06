import mongoose from 'mongoose';

const measurementFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ['number', 'text', 'select', 'boolean'], required: true },
    unit: { type: String, trim: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const measurementTemplateSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    fields: {
      type: [measurementFieldSchema],
      validate: [(fields) => fields.length > 0, 'At least one measurement field is required'],
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

measurementTemplateSchema.index({ shopId: 1, name: 1 }, { unique: true });

const MeasurementTemplate = mongoose.models.MeasurementTemplate
  || mongoose.model('MeasurementTemplate', measurementTemplateSchema);

export default MeasurementTemplate;