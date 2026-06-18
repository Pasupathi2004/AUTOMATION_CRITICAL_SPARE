import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  plant: { type: String, enum: ['plant1', 'plant2'], default: 'plant1', index: true },
  name: String,
  make: String,
  model: String,
  specification: String,
  // Optional free-form note shown in the UI (Spares List) and exports.
  remarks: { type: String, default: '' },
  quantity: Number,
  minimumQuantity: Number,
  // Optional reorder quantity threshold
  roq: Number,
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