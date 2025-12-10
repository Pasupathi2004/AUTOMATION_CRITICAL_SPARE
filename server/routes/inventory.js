import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import { authenticateToken } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'), false);
      }
    }
});

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
  const items = await Inventory.find();
  // Map _id to id as string
  const itemsWithId = items.map(item => ({
    ...item.toObject(),
    id: item._id.toString()
  }));
  res.json({ success: true, items: itemsWithId });
});

// Add a new item
router.post('/', authenticateToken, async (req, res) => {
  const body = {
    ...req.body,
    quantity: Number(req.body.quantity),
    minimumQuantity: Number(req.body.minimumQuantity)
  };
  if (isNaN(body.quantity) || isNaN(body.minimumQuantity)) {
    return res.status(400).json({ success: false, message: 'Quantity and minimumQuantity must be numbers.' });
  }
  const item = new Inventory(body);
  await item.save();
  res.json({ success: true, item });
});

// Update an item
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID' });
  }
  // Find the current item
  const currentItem = await Inventory.findById(id);
  if (!currentItem) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }
  // Parse quantity and minimumQuantity as numbers
  const body = {
    ...req.body,
    quantity: Number(req.body.quantity),
    minimumQuantity: Number(req.body.minimumQuantity)
  };
  if (isNaN(body.quantity) || isNaN(body.minimumQuantity)) {
    return res.status(400).json({ success: false, message: 'Quantity and minimumQuantity must be numbers.' });
  }
  // Update the item
  const updatedItem = await Inventory.findByIdAndUpdate(id, body, { new: true });

  // If quantity changed, create a transaction
  if (typeof body.quantity === 'number' && body.quantity !== currentItem.quantity) {
    const change = body.quantity - currentItem.quantity;
    const transactionType = change > 0 ? 'added' : 'taken';
    const normalizedPurpose = (req.body.purpose || 'others').toString().toLowerCase() === 'breakdown'
      ? 'breakdown'
      : 'others';
    const transaction = new Transaction({
      itemId: id,
      itemName: currentItem.name,
      type: transactionType,
      quantity: Math.abs(change),
      user: req.user?.username || 'system',
      timestamp: new Date().toISOString(),
      purpose: normalizedPurpose,
      remarks: typeof req.body.remarks === 'string' ? req.body.remarks : '',
      // Include full item specifications for better analytics
      make: currentItem.make || '',
      model: currentItem.model || '',
      specification: currentItem.specification || '',
      rack: currentItem.rack || '',
      bin: currentItem.bin || ''
    });
    await transaction.save();
    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').emit('inventoryUpdated', updatedItem);
      req.app.get('io').emit('transactionCreated', transaction);
    }
  }

  res.json({ success: true, item: updatedItem });
});

// Delete an item
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID' });
  }
  const deletedItem = await Inventory.findByIdAndDelete(id);
  if (!deletedItem) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }
  // Create a transaction record for deletion
  const transaction = new Transaction({
    itemId: id,
    itemName: deletedItem.name,
    type: 'deleted',
    quantity: deletedItem.quantity,
    user: req.user?.username || 'system',
    timestamp: new Date().toISOString(),
    // Include full item specifications for better analytics
    make: deletedItem.make || '',
    model: deletedItem.model || '',
    specification: deletedItem.specification || '',
    rack: deletedItem.rack || '',
    bin: deletedItem.bin || ''
  });
  await transaction.save();
  // Emit socket event for real-time updates
  if (req.app.get('io')) {
    req.app.get('io').emit('inventoryDeleted', { id, item: deletedItem });
    req.app.get('io').emit('transactionCreated', transaction);
  }
  res.json({ success: true });
});

// Bulk upload endpoint
router.post('/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip header row and validate data
    const items = [];
    const errors = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 8) continue;

      // Parse row with optional category field (can be in different positions based on CSV structure)
      // Try to handle both old format (8 cols) and new format (9+ cols)
      const name = row[0];
      const make = row[1];
      const model = row[2];
      const specification = row[3];
      const rack = row[4];
      const bin = row[5];
      const quantity = row[6];
      const minimumQuantity = row[7];
      // Category might be at position 8 or later depending on CSV structure
      let category = row[8];
      
      // Validate required fields
      if (!name || !make || !model || !specification || !rack || !bin) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      // Validate numeric fields
      const quantityNum = parseInt(quantity);
      const minimumQuantityNum = parseInt(minimumQuantity);
      
      if (isNaN(quantityNum) || quantityNum < 0) {
        errors.push(`Row ${i + 1}: Invalid quantity`);
        continue;
      }

      if (isNaN(minimumQuantityNum) || minimumQuantityNum < 0) {
        errors.push(`Row ${i + 1}: Invalid minimum quantity`);
      continue;
    }

      // Validate and normalize category
      const categoryStr = category ? category.toString().trim().toLowerCase() : 'consumable';
      const validCategory = (categoryStr === 'critical' || categoryStr === 'consumable') 
        ? categoryStr 
        : 'consumable';

      items.push({
        name: name.toString().trim(),
        make: make.toString().trim(),
        model: model.toString().trim(),
        specification: specification.toString().trim(),
        rack: rack.toString().trim(),
        bin: bin.toString().trim(),
        quantity: quantityNum,
        minimumQuantity: minimumQuantityNum,
        category: validCategory,
        updatedBy: req.user?.username || 'bulk-upload'
      });
  }
  
    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation errors found', 
        errors 
      });
    }

    if (items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid items found in the file' 
      });
    }

    // Insert items into database
    const savedItems = await Inventory.insertMany(items);
    
    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').emit('bulkUploadCompleted', {
        count: savedItems.length,
        items: savedItems
      });
  }
  
    res.json({ 
      success: true, 
      message: `Successfully uploaded ${savedItems.length} items`,
      count: savedItems.length,
      items: savedItems
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing bulk upload',
      error: error.message 
    });
  }
});

export default router;