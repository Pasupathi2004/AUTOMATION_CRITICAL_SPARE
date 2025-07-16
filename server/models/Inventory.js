import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  specification: {
    type: String,
    required: true,
    trim: true
  },
  rack: {
    type: String,
    required: true,
    trim: true
  },
  bin: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minimumQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  updatedBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
inventorySchema.index({ name: 1 });
inventorySchema.index({ make: 1 });
inventorySchema.index({ model: 1 });
inventorySchema.index({ rack: 1, bin: 1 });
inventorySchema.index({ quantity: 1 }); // For low stock queries

export default mongoose.model('Inventory', inventorySchema); 