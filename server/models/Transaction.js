import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  itemId: { type: String },
  itemName: { type: String },
  type: { type: String },
  quantity: { type: Number },
  user: { type: String },
  timestamp: { type: Date },
  remarks: { type: String, default: '' },
  editedBy: { type: String, default: '' },
  editedAt: { type: Date },
  // Enhanced item details for better analytics
  make: { type: String, default: '' },
  model: { type: String, default: '' },
  specification: { type: String, default: '' },
  rack: { type: String, default: '' },
  bin: { type: String, default: '' }
});

export default mongoose.model('Transaction', TransactionSchema); 