import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name: String,
  make: String,
  model: String,
  specification: String,
  quantity: Number,
  rack: String,
  bin: String,
  updatedAt: Date,
  updatedBy: String
});

export default mongoose.model('Inventory', InventorySchema); 