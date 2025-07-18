import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Get all transactions
router.get('/', async (req, res) => {
  const transactions = await Transaction.find();
  res.json({ success: true, transactions });
});

// Add a new transaction
router.post('/', async (req, res) => {
  const transaction = new Transaction(req.body);
  await transaction.save();
  res.json({ success: true, transaction });
});

// Delete all transactions
router.delete('/', async (req, res) => {
  await Transaction.deleteMany({});
  res.json({ success: true });
});

export default router;