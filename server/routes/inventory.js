import express from 'express';
import Inventory from '../models/Inventory.js';

const router = express.Router();

// Get all inventory items
router.get('/', async (req, res) => {
  const items = await Inventory.find();
  res.json({ success: true, items });
});

// Add a new item
router.post('/', async (req, res) => {
  const item = new Inventory(req.body);
  await item.save();
  res.json({ success: true, item });
});

// Update an item
router.put('/:id', async (req, res) => {
  const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, item });
});

// Delete an item
router.delete('/:id', async (req, res) => {
  await Inventory.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;