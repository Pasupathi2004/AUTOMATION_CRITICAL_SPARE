import express from 'express';
import Request from '../models/Request.js';
import Transaction from '../models/Transaction.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getPlant } from '../constants/plants.js';

const router = express.Router();

const withPlant = (doc, plant) => {
  const obj = doc?.toObject ? doc.toObject() : doc;
  return { ...obj, plant, id: obj._id?.toString?.() || obj.id };
};

// Get requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const plant = getPlant(req);
    const RequestModel = Request(plant);
    const filter = {};
    if (status) filter.status = status;
    if ((req.user?.role || '').toLowerCase() !== 'admin') {
      filter.requestedBy = req.user?.username || '';
    }
    const requests = await RequestModel.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      requests: requests.map((request) => withPlant(request, plant)),
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Create a new request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { itemId, itemName, quantity, remarks, purpose } = req.body;
    const normalizedPurpose = (purpose || '').toLowerCase() === 'breakdown' ? 'breakdown' : 'others';
    const plant = getPlant(req);
    const RequestModel = Request(plant);

    if (!itemName || typeof quantity === 'undefined') {
      return res.status(400).json({ success: false, message: 'Item name and quantity are required' });
    }

    const request = new RequestModel({
      itemId,
      itemName,
      quantity: Number(quantity),
      remarks: remarks || '',
      purpose: normalizedPurpose,
      requestedBy: req.user?.username || 'user'
    });
    await request.save();

    const payload = withPlant(request, plant);
    if (req.app.get('io')) {
      req.app.get('io').emit('requestCreated', payload);
    }

    res.json({ success: true, request: payload });
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

    const plant = getPlant(req);
    const RequestModel = Request(plant);
    const TransactionModel = Transaction(plant);
    const updated = await RequestModel.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    try {
      const txFilter = {
        itemId: updated.itemId || undefined,
        purpose: 'breakdown',
        requestedBy: updated.requestedBy || '',
        requestStatus: { $in: ['pending', ''] }
      };
      await TransactionModel.updateMany(txFilter, { requestStatus: updated.status, resolvedBy: updated.resolvedBy || '' });
    } catch (e) {
      console.error('Failed to sync transaction request status:', e);
    }

    const payload = withPlant(updated, plant);
    if (req.app.get('io')) {
      req.app.get('io').emit('requestUpdated', payload);
    }

    res.json({ success: true, request: payload });
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

export default router;
