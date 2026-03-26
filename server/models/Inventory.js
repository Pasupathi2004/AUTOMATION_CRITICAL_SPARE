import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  name: String,
  make: String,
  model: String,
  specification: String,
  // Optional free-form note shown in the UI (Spares List) and exports.
  remarks: { type: String, default: '' },
  quantity: Number,
  minimumQuantity: Number,
  // Optional maximum quantity threshold (upper limit for stock)
  maximumQuantity: Number,
  rack: String,
  bin: String,
  // Optional cost per single item
  cost: Number,
  category: { type: String, enum: ['critical', 'consumable'], default: 'consumable' },
  updatedBy: String
}, { timestamps: true }); // Enable timestamps

export default mongoose.model('Inventory', InventorySchema); 