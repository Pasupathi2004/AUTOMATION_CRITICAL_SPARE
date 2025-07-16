import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['added', 'taken', 'deleted'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  user: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
transactionSchema.index({ itemId: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ timestamp: -1 }); // For recent transactions
transactionSchema.index({ itemName: 1 });

export default mongoose.model('Transaction', transactionSchema); 