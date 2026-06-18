import mongoose from 'mongoose';
import { isValidPlant, plantCollectionName as collectionName } from '../constants/plants.js';

const modelCache = new Map();

const InventorySchema = new mongoose.Schema({
  name: String,
  make: String,
  model: String,
  specification: String,
  remarks: { type: String, default: '' },
  quantity: Number,
  minimumQuantity: Number,
  roq: Number,
  maximumQuantity: Number,
  rack: String,
  bin: String,
  cost: Number,
  category: { type: String, enum: ['critical', 'consumable'], default: 'consumable' },
  updatedBy: String
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  itemId: { type: String },
  itemName: { type: String },
  type: { type: String },
  quantity: { type: Number },
  user: { type: String },
  timestamp: { type: Date },
  purpose: { type: String, enum: ['breakdown', 'others'], default: 'others' },
  requestedBy: { type: String, default: '' },
  requestStatus: { type: String, enum: ['pending', 'approved', 'rejected', ''], default: '' },
  resolvedBy: { type: String, default: '' },
  remarks: { type: String, default: '' },
  editedBy: { type: String, default: '' },
  editedAt: { type: Date },
  make: { type: String, default: '' },
  model: { type: String, default: '' },
  specification: { type: String, default: '' },
  rack: { type: String, default: '' },
  bin: { type: String, default: '' }
});

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

function getCachedModel(modelKey, schema, collection) {
  if (modelCache.has(modelKey)) {
    return modelCache.get(modelKey);
  }
  const model = mongoose.models[modelKey] || mongoose.model(modelKey, schema, collection);
  modelCache.set(modelKey, model);
  return model;
}

export function getInventoryModel(plant) {
  if (!isValidPlant(plant)) {
    throw new Error(`Invalid plant: ${plant}`);
  }
  const modelKey = `Inventory_${plant}`;
  const collection = collectionName('inventories', plant);
  return getCachedModel(modelKey, InventorySchema, collection);
}

export function getTransactionModel(plant) {
  if (!isValidPlant(plant)) {
    throw new Error(`Invalid plant: ${plant}`);
  }
  const modelKey = `Transaction_${plant}`;
  const collection = collectionName('transactions', plant);
  return getCachedModel(modelKey, TransactionSchema, collection);
}

export function getRequestModel(plant) {
  if (!isValidPlant(plant)) {
    throw new Error(`Invalid plant: ${plant}`);
  }
  const modelKey = `Request_${plant}`;
  const collection = collectionName('requests', plant);
  return getCachedModel(modelKey, RequestSchema, collection);
}

export { InventorySchema, TransactionSchema, RequestSchema };
