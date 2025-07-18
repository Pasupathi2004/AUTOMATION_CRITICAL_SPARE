import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name: String,
  make: String,
  model: String,
  specification: String,
  quantity: Number,
  rack: String,
  bin: String,
  updatedBy: String
}, { timestamps: true }); // Enable timestamps

export default mongoose.model('Inventory', InventorySchema); 