import express from 'express';
import Transaction from '../models/Transaction.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

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

// Update a transaction (owner-only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Owner check: username 'pasu' or role 'owner'
    const isOwner = (req.user?.username || '').toLowerCase() === 'pasu' || (req.user?.role || '').toLowerCase() === 'owner';
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only owner can edit transactions' });
    }

    const { id } = req.params;
    const { timestamp, remarks, quantity, editedBy, specification, purpose } = req.body;

    const update = {
      ...(timestamp ? { timestamp: new Date(timestamp) } : {}),
      ...(typeof remarks === 'string' ? { remarks } : {}),
      ...(typeof quantity !== 'undefined' && !isNaN(Number(quantity)) ? { quantity: Number(quantity) } : {}),
      ...(typeof specification === 'string' ? { specification } : {}),
      ...(typeof purpose === 'string' ? { purpose } : {}),
      // Allow owner to explicitly set editedBy via body; fallback to current user
      editedBy: (typeof editedBy === 'string' && editedBy.trim().length > 0) ? editedBy.trim() : (req.user?.username || 'owner'),
      editedAt: new Date()
    };

    const tx = await Transaction.findByIdAndUpdate(id, update, { new: true });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    return res.json({ success: true, transaction: tx });
  } catch (e) {
    console.error('Update transaction error:', e);
    return res.status(500).json({ success: false, message: 'Error updating transaction' });
  }
});

export default router;