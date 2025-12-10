import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import Inventory from '../models/Inventory.js';
import { sendLowStockEmail, sendTestEmail } from '../utils/emailService.js';

const router = express.Router();

// Get low stock items
router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const inventory = await Inventory.find();
    const lowStockItems = inventory.filter(i => i.quantity <= i.minimumQuantity);
    
    res.json({
      success: true,
      count: lowStockItems.length,
      items: lowStockItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send low stock email manually (owner only)
router.post('/send-low-stock', authenticateToken, async (req, res) => {
  try {
    // Check if user is owner
    const isOwner = (req.user?.username || '').toLowerCase() === 'pasu' || (req.user?.role || '').toLowerCase() === 'owner';
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only owner can send emails' });
    }

    const { recipientEmails } = req.body;
    
    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipient emails are required' });
    }

    const inventory = await Inventory.find();
    const lowStockItems = inventory.filter(i => i.quantity <= i.minimumQuantity);

    const result = await sendLowStockEmail(lowStockItems, recipientEmails);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Low stock email sent successfully',
        recipients: recipientEmails,
        itemsCount: lowStockItems.length
      });
    } else {
      res.status(500).json({ success: false, message: result.message || 'Failed to send email' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send test email
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const isOwner = (req.user?.username || '').toLowerCase() === 'pasu' || (req.user?.role || '').toLowerCase() === 'owner';
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Only owner can send test emails' });
    }

    const { recipientEmail } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const result = await sendTestEmail(recipientEmail);
    
    if (result.success) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: result.message || 'Failed to send email' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

