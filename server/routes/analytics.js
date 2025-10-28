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

  // Allow selecting month/year via query params; default to current
  const now = new Date();
  const selectedMonth = Number.isInteger(Number(req.query.month)) ? Number(req.query.month) : now.getMonth();
  const selectedYear = Number.isInteger(Number(req.query.year)) ? Number(req.query.year) : now.getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.timestamp);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  // Build fast lookup for inventory by id (primary) and name (fallback)
  const inventoryById = new Map(inventory.map((i) => [i._id?.toString?.(), i]));
  const inventoryByName = new Map(inventory.map((i) => [i.name, i]));

  // Enrich all monthly transactions with item details
  const enrichedRecentTransactions = monthlyTransactions
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map((t) => {
      const item = inventoryById.get(t.itemId) || inventoryByName.get(t.itemName);
      return {
        id: t._id?.toString?.() || undefined,
        itemName: t.itemName,
        type: t.type,
        quantity: t.quantity,
        user: t.user,
        timestamp: t.timestamp,
        remarks: t.remarks || '',
        editedBy: t.editedBy || '',
        editedAt: t.editedAt || null,
        // Prioritize stored transaction data, fallback to inventory lookup
        make: t.make || item?.make || '',
        model: t.model || item?.model || '',
        specification: t.specification || item?.specification || '',
        rack: t.rack || item?.rack || '',
        bin: t.bin || item?.bin || ''
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
    lowStockAlerts: inventory.filter(i => i.quantity <= i.minimumQuantity),
    selectedMonth,
    selectedYear
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

  // Allow selecting month/year via query params; default to current
  const now = new Date();
  const selectedMonth = Number.isInteger(Number(req.query.month)) ? Number(req.query.month) : now.getMonth();
  const selectedYear = Number.isInteger(Number(req.query.year)) ? Number(req.query.year) : now.getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.timestamp);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
  });

  // Build fast lookup for inventory by id (primary) and name (fallback)
  const inventoryById = new Map(inventory.map((i) => [i._id?.toString?.(), i]));
  const inventoryByName = new Map(inventory.map((i) => [i.name, i]));

  // Enrich all monthly transactions with item details
  const enrichedRecentTransactions = monthlyTransactions
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map((t) => {
      const item = inventoryById.get(t.itemId) || inventoryByName.get(t.itemName);
      return {
        id: t._id?.toString?.() || undefined,
        itemName: t.itemName,
        type: t.type,
        quantity: t.quantity,
        user: t.user,
        timestamp: t.timestamp,
        remarks: t.remarks || '',
        editedBy: t.editedBy || '',
        editedAt: t.editedAt || null,
        // Prioritize stored transaction data, fallback to inventory lookup
        make: t.make || item?.make || '',
        model: t.model || item?.model || '',
        specification: t.specification || item?.specification || '',
        rack: t.rack || item?.rack || '',
        bin: t.bin || item?.bin || ''
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
    lowStockAlerts: inventory.filter(i => i.quantity <= i.minimumQuantity),
    selectedMonth,
    selectedYear
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