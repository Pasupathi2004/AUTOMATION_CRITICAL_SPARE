import mongoose from 'mongoose';

const RequestSchema = new mongoose.Schema({
  itemId: { type: String },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  purpose: { type: String, enum: ['breakdown', 'others'], default: 'breakdown' },
  remarks: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedBy: { type: String, required: true },
  resolvedBy: { type: String, default: '' },
  resolvedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Request', RequestSchema);

