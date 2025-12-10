import express from 'express';
import Request from '../models/Request.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get requests
// Admins: can filter all, optionally by status query param.
// Non-admin: only their own requests.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if ((req.user?.role || '').toLowerCase() !== 'admin') {
      filter.requestedBy = req.user?.username || '';
    }
    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Create a new request (triggered on breakdown purpose)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { itemId, itemName, quantity, remarks, purpose } = req.body;
    const normalizedPurpose = (purpose || '').toLowerCase() === 'breakdown' ? 'breakdown' : 'others';

    if (!itemName || typeof quantity === 'undefined') {
      return res.status(400).json({ success: false, message: 'Item name and quantity are required' });
    }

    const request = new Request({
      itemId,
      itemName,
      quantity: Number(quantity),
      remarks: remarks || '',
      purpose: normalizedPurpose,
      requestedBy: req.user?.username || 'user'
    });
    await request.save();

    // Notify all connected clients (admins can listen for this)
    if (req.app.get('io')) {
      req.app.get('io').emit('requestCreated', request);
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ success: false, message: 'Failed to create request' });
  }
});

// Update a request status (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const update = {
      ...(status ? { status } : {}),
      ...(remarks ? { remarks } : {}),
      resolvedBy: req.user?.username || '',
      resolvedAt: new Date()
    };

    const updated = await Request.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Mirror request resolution onto related breakdown transactions (best-effort)
    try {
      const txFilter = {
        itemId: updated.itemId || undefined,
        purpose: 'breakdown',
        requestedBy: updated.requestedBy || '',
        requestStatus: { $in: ['pending', ''] }
      };
      await Transaction.updateMany(txFilter, { requestStatus: updated.status, resolvedBy: updated.resolvedBy || '' });
    } catch (e) {
      console.error('Failed to sync transaction request status:', e);
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('requestUpdated', updated);
    }

    res.json({ success: true, request: updated });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

export default router;

