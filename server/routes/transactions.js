import express from 'express';
import Transaction from '../models/Transaction.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getPlant } from '../constants/plants.js';

const router = express.Router();

const withPlant = (doc, plant) => {
  const obj = doc?.toObject ? doc.toObject() : doc;
  return { ...obj, plant, id: obj._id?.toString?.() || obj.id };
};

// Get all transactions
router.get('/', authenticateToken, async (req, res) => {
  const plant = getPlant(req);
  const transactions = await Transaction(plant).find();
  res.json({
    success: true,
    transactions: transactions.map((tx) => withPlant(tx, plant)),
  });
});

// Add a new transaction
router.post('/', authenticateToken, async (req, res) => {
  const plant = getPlant(req);
  const transaction = new Transaction(plant)(req.body);
  await transaction.save();
  res.json({ success: true, transaction: withPlant(transaction, plant) });
});

// Delete all transactions
router.delete('/', authenticateToken, async (req, res) => {
  const plant = getPlant(req);
  await Transaction(plant).deleteMany({});
  res.json({ success: true });
});

// Update a transaction (owner-only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const isOwner = (req.user?.username || '').toLowerCase() === 'pasu' || (req.user?.role || '').toLowerCase() === 'owner';
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only owner can edit transactions' });
    }

    const { id } = req.params;
    const plant = getPlant(req);
    const TransactionModel = Transaction(plant);
    const { timestamp, remarks, quantity, editedBy, specification, purpose } = req.body;

    const update = {
      ...(timestamp ? { timestamp: new Date(timestamp) } : {}),
      ...(typeof remarks === 'string' ? { remarks } : {}),
      ...(typeof quantity !== 'undefined' && !isNaN(Number(quantity)) ? { quantity: Number(quantity) } : {}),
      ...(typeof specification === 'string' ? { specification } : {}),
      ...(typeof purpose === 'string' ? { purpose } : {}),
      editedBy: (typeof editedBy === 'string' && editedBy.trim().length > 0) ? editedBy.trim() : (req.user?.username || 'owner'),
      editedAt: new Date()
    };

    const tx = await TransactionModel.findByIdAndUpdate(id, update, { new: true });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    return res.json({ success: true, transaction: withPlant(tx, plant) });
  } catch (e) {
    console.error('Update transaction error:', e);
    return res.status(500).json({ success: false, message: 'Error updating transaction' });
  }
});

export default router;
