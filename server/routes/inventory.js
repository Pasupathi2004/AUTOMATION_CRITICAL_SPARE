import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import { authenticateToken } from '../middleware/auth.js';
import { getPlant } from '../constants/plants.js';
import mongoose from 'mongoose';

const withPlant = (doc, plant) => {
  const obj = doc?.toObject ? doc.toObject() : doc;
  return { ...obj, plant, id: obj._id?.toString?.() || obj.id };
};

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
  const plant = getPlant(req);
  const InventoryModel = Inventory(plant);
  const items = await InventoryModel.find();
  const itemsWithId = items.map(item => withPlant(item, plant));
  res.json({ success: true, items: itemsWithId });
});

// Add a new item
router.post('/', authenticateToken, async (req, res) => {
  const {
    maximumQuantity: _rawMaxIgnored,
    cost: _rawCostIgnored,
    roq: _rawRoqIgnored,
    // Keep item-level remarks separate from transaction remarks
    itemRemarks: _itemRemarksIgnored,
    transactionRemarks: _txRemarksIgnored,
    remarks: _legacyRemarksIgnored,
    ...restBody
  } = req.body;
  // Parse numeric fields safely, allowing optional roq, maximumQuantity and cost
  const quantity = Number(req.body.quantity);
  const minimumQuantity = Number(req.body.minimumQuantity);
  const rawRoq = req.body.roq;
  let roq;
  if (rawRoq !== undefined && rawRoq !== '') {
    roq = Number(rawRoq);
  }

  const rawMax = req.body.maximumQuantity;
  let maximumQuantity;
  if (rawMax !== undefined && rawMax !== '') {
    maximumQuantity = Number(rawMax);
  }

  const rawCost = req.body.cost;
  let cost;
  if (rawCost !== undefined && rawCost !== '') {
    cost = Number(rawCost);
  }

  const itemRemarks = typeof req.body.itemRemarks === 'string' ? req.body.itemRemarks : '';

  if (isNaN(quantity) || isNaN(minimumQuantity)) {
    return res.status(400).json({ success: false, message: 'Quantity and minimumQuantity must be numbers.' });
  }

  if (maximumQuantity !== undefined && (isNaN(maximumQuantity) || maximumQuantity < 0)) {
    return res.status(400).json({ success: false, message: 'maximumQuantity must be a non-negative number when provided.' });
  }
  if (roq !== undefined && (isNaN(roq) || roq < 0)) {
    return res.status(400).json({ success: false, message: 'ROQ must be a non-negative number when provided.' });
  }

  if (cost !== undefined && (isNaN(cost) || cost < 0)) {
    return res.status(400).json({ success: false, message: 'Cost must be a non-negative number when provided.' });
  }

  const item = new Inventory(getPlant(req))({
    ...restBody,
    remarks: itemRemarks,
    quantity,
    minimumQuantity,
    ...(roq !== undefined ? { roq } : {}),
    ...(maximumQuantity !== undefined ? { maximumQuantity } : {}),
    ...(cost !== undefined ? { cost } : {})
  });
  await item.save();
  res.json({ success: true, item: withPlant(item, getPlant(req)) });
});

// Update an item
router.put('/:id', authenticateToken, async (req, res) => {
  const {
    maximumQuantity: _rawMaxIgnored2,
    cost: _rawCostIgnored2,
    roq: _rawRoqIgnored2,
    // Keep item-level remarks separate from transaction remarks
    itemRemarks: _itemRemarksIgnored2,
    transactionRemarks: _txRemarksIgnored2,
    remarks: _legacyRemarksIgnored2,
    ...restBody
  } = req.body;
  const { id } = req.params;
  const plant = getPlant(req);
  const InventoryModel = Inventory(plant);
  const TransactionModel = Transaction(plant);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID' });
  }
  const currentItem = await InventoryModel.findById(id);
  if (!currentItem) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }
  // Parse quantity and minimumQuantity as numbers
  const quantity = Number(req.body.quantity);
  const minimumQuantity = Number(req.body.minimumQuantity);
  const rawRoq = req.body.roq;
  let roq;
  if (rawRoq !== undefined && rawRoq !== '') {
    roq = Number(rawRoq);
  }

  const rawMax = req.body.maximumQuantity;
  let maximumQuantity;
  if (rawMax !== undefined && rawMax !== '') {
    maximumQuantity = Number(rawMax);
  }

  const rawCost = req.body.cost;
  let cost = currentItem.cost;
  if (rawCost !== undefined && rawCost !== '') {
    cost = Number(rawCost);
  }

  if (isNaN(quantity) || isNaN(minimumQuantity)) {
    return res.status(400).json({ success: false, message: 'Quantity and minimumQuantity must be numbers.' });
  }

  if (maximumQuantity !== undefined && (isNaN(maximumQuantity) || maximumQuantity < 0)) {
    return res.status(400).json({ success: false, message: 'maximumQuantity must be a non-negative number when provided.' });
  }
  if (roq !== undefined && (isNaN(roq) || roq < 0)) {
    return res.status(400).json({ success: false, message: 'ROQ must be a non-negative number when provided.' });
  }

  if (cost !== undefined && (isNaN(cost) || cost < 0)) {
    return res.status(400).json({ success: false, message: 'Cost must be a non-negative number when provided.' });
  }

  const itemRemarks = typeof req.body.itemRemarks === 'string' ? req.body.itemRemarks : undefined;

  const quantityChanged = typeof quantity === 'number' && quantity !== currentItem.quantity;
  // Search / take-quantity flow always sends `transactionRemarks`. Those belong on the Transaction
  // only — never overwrite spare master-data `remarks` when stock moves.
  const isStockMovementRequest = Object.prototype.hasOwnProperty.call(req.body, 'transactionRemarks');
  const skipItemRemarksBecauseOfStockMove = quantityChanged && isStockMovementRequest;

  // Update the item
  const updatedItem = await InventoryModel.findByIdAndUpdate(
    id,
    {
      ...restBody,
      ...(itemRemarks !== undefined && !skipItemRemarksBecauseOfStockMove ? { remarks: itemRemarks } : {}),
      quantity,
      minimumQuantity,
      ...(roq !== undefined ? { roq } : {}),
      ...(maximumQuantity !== undefined ? { maximumQuantity } : {}),
      ...(cost !== undefined ? { cost } : {})
    },
    { new: true }
  );

  // If quantity changed, create a transaction
  if (quantityChanged) {
    const change = quantity - currentItem.quantity;
    const transactionType = change > 0 ? 'added' : 'taken';
    const normalizedPurpose = (req.body.purpose || 'others').toString().toLowerCase() === 'breakdown'
      ? 'breakdown'
      : 'others';
    const isBreakdown = normalizedPurpose === 'breakdown';
    const transactionRemarks =
      typeof req.body.transactionRemarks === 'string'
        ? req.body.transactionRemarks
        : (typeof req.body.remarks === 'string' ? req.body.remarks : '');
    const transaction = new TransactionModel({
      itemId: id,
      itemName: currentItem.name,
      type: transactionType,
      quantity: Math.abs(change),
      user: req.user?.username || 'system',
      timestamp: new Date().toISOString(),
      purpose: normalizedPurpose,
      requestedBy: isBreakdown ? (req.user?.username || '') : '',
      requestStatus: isBreakdown ? 'pending' : '',
      resolvedBy: '',
      remarks: transactionRemarks,
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
      const payload = withPlant(updatedItem, plant);
      req.app.get('io').emit('inventoryUpdated', payload);
      req.app.get('io').emit('transactionCreated', { ...transaction.toObject(), plant });
    }
  }

  const itemPayload = withPlant(updatedItem, plant);
  res.json({ success: true, item: itemPayload });
});

// Delete an item
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const plant = getPlant(req);
  const InventoryModel = Inventory(plant);
  const TransactionModel = Transaction(plant);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID' });
  }
  const deletedItem = await InventoryModel.findByIdAndDelete(id);
  if (!deletedItem) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }
  // Create a transaction record for deletion
  const transaction = new TransactionModel({
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
    req.app.get('io').emit('inventoryDeleted', { id, item: withPlant(deletedItem, plant) });
    req.app.get('io').emit('transactionCreated', { ...transaction.toObject(), plant });
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
      // Optional maximum quantity at position 8 in the updated template
      const rawMaximumQuantity = row[8];
      // Category is at position 9 in the updated template (or 8 in older files)
      let category = row.length > 9 ? row[9] : row[8];
      // Optional cost per item at position 10 in the updated template (or 9 in older files)
      const rawCost = row.length > 10 ? row[10] : row[9];
      
      // Validate required fields
      if (!name || !make || !model || !specification || !rack || !bin) {
        errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      // Validate numeric fields
      const quantityNum = parseInt(quantity);
      const minimumQuantityNum = parseInt(minimumQuantity);
      let maximumQuantityNum;
      if (rawMaximumQuantity !== undefined && rawMaximumQuantity !== '') {
        maximumQuantityNum = parseInt(rawMaximumQuantity);
      }
      
      if (isNaN(quantityNum) || quantityNum < 0) {
        errors.push(`Row ${i + 1}: Invalid quantity`);
        continue;
      }

      if (isNaN(minimumQuantityNum) || minimumQuantityNum < 0) {
        errors.push(`Row ${i + 1}: Invalid minimum quantity`);
        continue;
      }

      if (maximumQuantityNum !== undefined && (isNaN(maximumQuantityNum) || maximumQuantityNum < 0)) {
        errors.push(`Row ${i + 1}: Invalid maximum quantity`);
        continue;
      }

      // Validate optional cost field if provided
      let costNum;
      if (rawCost !== undefined && rawCost !== '') {
        costNum = parseFloat(rawCost);
        if (isNaN(costNum) || costNum < 0) {
          errors.push(`Row ${i + 1}: Invalid cost (must be a non-negative number)`);
          continue;
        }
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
        ...(maximumQuantityNum !== undefined ? { maximumQuantity: maximumQuantityNum } : {}),
        // Optional per-item cost from CSV
        ...(costNum !== undefined ? { cost: costNum } : {}),
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
    const plant = getPlant(req);
    const InventoryModel = Inventory(plant);
    const savedItems = await InventoryModel.insertMany(items);
    
    // Emit socket event for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').emit('bulkUploadCompleted', {
        count: savedItems.length,
        plant,
        items: savedItems.map((item) => withPlant(item, plant))
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