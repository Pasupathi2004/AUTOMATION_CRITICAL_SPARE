import express from 'express';
import { readJSON, checkDataIntegrity, DB_PATHS } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Get analytics data
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const inventory = readJSON(DB_PATHS.INVENTORY);
  const transactions = readJSON(DB_PATHS.TRANSACTIONS);

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

// Get data integrity status (admin only)
router.get('/integrity', authenticateToken, requireRole(['admin']), (req, res) => {
  try {
    const integrity = checkDataIntegrity();
    res.json({ success: true, integrity });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to check data integrity' });
  }
});

// Get storage usage in MB (admin only)
router.get('/settings/storage', authenticateToken, requireRole(['admin']), (req, res) => {
  const dataDir = path.join(process.cwd(), 'server', 'data');
  let totalBytes = 0;
  try {
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      const stats = fs.statSync(path.join(dataDir, file));
      if (stats.isFile()) totalBytes += stats.size;
    }
    const storageMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
    res.json({ success: true, storageMB });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to calculate storage' });
  }
});

export default router;