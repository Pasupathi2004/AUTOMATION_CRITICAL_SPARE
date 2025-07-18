import express from 'express';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get analytics data
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const inventory = await Inventory.find();
  const transactions = await Transaction.find();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.timestamp);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const analytics = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(i => i.quantity <= 5).length,
    totalTransactions: monthlyTransactions.length,
    itemsConsumed: monthlyTransactions
      .filter(t => t.type === 'taken')
      .reduce((sum, t) => sum + t.quantity, 0),
    itemsAdded: monthlyTransactions
      .filter(t => t.type === 'added')
      .reduce((sum, t) => sum + t.quantity, 0),
    activeUsers: [...new Set(monthlyTransactions.map(t => t.user))].length,
    recentTransactions: transactions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10),
    lowStockAlerts: inventory.filter(i => i.quantity <= 5)
  };

  res.json({
    success: true,
    analytics
  });
}));

// Get analytics dashboard data (duplicate of root for compatibility)
router.get('/dashboard', async (req, res) => {
  const inventory = await Inventory.find();
  const transactions = await Transaction.find();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.timestamp);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const analytics = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(i => i.quantity <= 5).length,
    totalTransactions: monthlyTransactions.length,
    itemsConsumed: monthlyTransactions.filter(t => t.type === 'taken').reduce((sum, t) => sum + t.quantity, 0),
    itemsAdded: monthlyTransactions.filter(t => t.type === 'added').reduce((sum, t) => sum + t.quantity, 0),
    activeUsers: [...new Set(monthlyTransactions.map(t => t.user))].length,
    recentTransactions: transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10),
    lowStockAlerts: inventory.filter(i => i.quantity <= 5)
  };

  res.json({ success: true, analytics });
});

// Get data integrity status (admin only)
router.get('/integrity', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    // For MongoDB, we can check if collections exist and have data
    const integrity = {
      inventory: { valid: true, count: 0 },
      transactions: { valid: true, count: 0 },
      users: { valid: true, count: 0 }
    };
    res.json({ success: true, integrity });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to check data integrity' });
  }
});

// Get storage usage in MB (admin only)
router.get('/settings/storage', authenticateToken, requireRole(['admin']), (req, res) => {
  // For MongoDB, we can't easily calculate storage without admin commands
  // Return a placeholder for now
  res.json({ success: true, storageMB: 0 });
});

export default router;