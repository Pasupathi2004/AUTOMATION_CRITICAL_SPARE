import express from 'express';
import { readJSON, safeWriteJSON, DB_PATHS } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Helper function to emit Socket.IO events
const emitTransactionEvent = (req, event, data) => {
  const io = req.app.get('io');
  if (io) {
    io.emit(event, data);
  }
};

// Get all transactions
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const transactions = readJSON(DB_PATHS.TRANSACTIONS);
  const sortedTransactions = transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json({
    success: true,
    transactions: sortedTransactions
  });
}));

// Create manual transaction
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { itemId, itemName, type, quantity } = req.body;

  if (!itemId || !itemName || !type || !quantity) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  if (!['added', 'taken', 'deleted'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid transaction type'
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be positive'
    });
  }

  const transactions = readJSON(DB_PATHS.TRANSACTIONS);

  const transaction = {
    id: Math.max(...transactions.map(t => t.id), 0) + 1,
    itemId: parseInt(itemId),
    itemName,
    type,
    quantity: parseInt(quantity),
    user: req.user.username,
    timestamp: new Date().toISOString()
  };

  transactions.push(transaction);
  
  if (!(await safeWriteJSON(DB_PATHS.TRANSACTIONS, transactions))) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create transaction'
    });
  }

  // Emit Socket.IO event
  emitTransactionEvent(req, 'transactionCreated', transaction);

  res.status(201).json({
    success: true,
    transaction
  });
}));

// Delete all transactions (admin only)
router.delete('/', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  if (!(await safeWriteJSON(DB_PATHS.TRANSACTIONS, []))) {
    return res.status(500).json({ success: false, message: 'Failed to delete transaction history' });
  }
  
  // Emit Socket.IO event
  emitTransactionEvent(req, 'transactionsCleared', { message: 'All transaction history cleared' });
  
  res.json({ success: true, message: 'All transaction history deleted' });
}));

export default router;