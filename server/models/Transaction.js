import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  itemId: { type: String },
  itemName: { type: String },
  type: { type: String },
  quantity: { type: Number },
  user: { type: String },
  timestamp: { type: Date },
  remarks: { type: String, default: '' }
});

export default mongoose.model('Transaction', TransactionSchema); 