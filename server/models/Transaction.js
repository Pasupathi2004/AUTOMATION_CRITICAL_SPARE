import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  itemName: String,
    type: String,
  quantity: Number,
  user: String,
  timestamp: Date
});

export default mongoose.model('Transaction', TransactionSchema); 