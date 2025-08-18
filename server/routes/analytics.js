import express from 'express';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';

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

  // Build fast lookup for inventory by name
  const inventoryByName = new Map(inventory.map((i) => [i.name, i]));

  // Enrich recent transactions with item details
  const enrichedRecentTransactions = transactions
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
    .map((t) => {
      const item = inventoryByName.get(t.itemName);
      return {
        id: t._id?.toString?.() || undefined,
        itemName: t.itemName,
        type: t.type,
        quantity: t.quantity,
        user: t.user,
        timestamp: t.timestamp,
        remarks: t.remarks || '',
        make: item?.make || '',
        model: item?.model || '',
        specification: item?.specification || '',
        rack: item?.rack || '',
        bin: item?.bin || ''
      };
    });

  const analytics = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(i => i.quantity <= i.minimumQuantity).length,
    totalTransactions: monthlyTransactions.length,
    itemsConsumed: monthlyTransactions
      .filter(t => t.type === 'taken')
      .reduce((sum, t) => sum + t.quantity, 0),
    itemsAdded: monthlyTransactions
      .filter(t => t.type === 'added')
      .reduce((sum, t) => sum + t.quantity, 0),
    activeUsers: [...new Set(monthlyTransactions.map(t => t.user))].length,
    recentTransactions: enrichedRecentTransactions,
    lowStockAlerts: inventory.filter(i => i.quantity <= i.minimumQuantity)
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

  // Build fast lookup for inventory by name
  const inventoryByName = new Map(inventory.map((i) => [i.name, i]));

  // Enrich recent transactions with item details
  const enrichedRecentTransactions = transactions
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
    .map((t) => {
      const item = inventoryByName.get(t.itemName);
      return {
        id: t._id?.toString?.() || undefined,
        itemName: t.itemName,
        type: t.type,
        quantity: t.quantity,
        user: t.user,
        timestamp: t.timestamp,
        remarks: t.remarks || '',
        make: item?.make || '',
        model: item?.model || '',
        specification: item?.specification || '',
        rack: item?.rack || '',
        bin: item?.bin || ''
      };
    });

  const analytics = {
    totalItems: inventory.length,
    lowStockItems: inventory.filter(i => i.quantity <= i.minimumQuantity).length,
    totalTransactions: monthlyTransactions.length,
    itemsConsumed: monthlyTransactions.filter(t => t.type === 'taken').reduce((sum, t) => sum + t.quantity, 0),
    itemsAdded: monthlyTransactions.filter(t => t.type === 'added').reduce((sum, t) => sum + t.quantity, 0),
    activeUsers: [...new Set(monthlyTransactions.map(t => t.user))].length,
    recentTransactions: enrichedRecentTransactions,
    lowStockAlerts: inventory.filter(i => i.quantity <= i.minimumQuantity)
  };

  res.json({ success: true, analytics });
});

// Data Integrity Endpoint
router.get('/integrity', authenticateToken, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const inventoryCount = await Inventory.countDocuments();
    const transactionCount = await Transaction.countDocuments();
    res.json({
      success: true,
      integrity: {
        users: { valid: true, count: userCount },
        inventory: { valid: true, count: inventoryCount },
        transactions: { valid: true, count: transactionCount }
      }
    });
  } catch (error) {
    res.json({ success: false, message: 'Integrity check failed', error: error.message });
  }
});

// Storage Usage Endpoint
router.get('/settings/storage', authenticateToken, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const storageMB = (stats.storageSize / (1024 * 1024)).toFixed(2);
    res.json({ success: true, storageMB });
  } catch (error) {
    res.json({ success: false, message: 'Storage check failed', error: error.message });
  }
});

export default router;