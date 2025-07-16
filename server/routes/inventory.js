import express from 'express';
import { readJSON, safeWriteJSON, DB_PATHS } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import multer from 'multer';
import XLSX from 'xlsx';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to emit Socket.IO events
const emitInventoryEvent = (req, event, data) => {
  const io = req.app.get('io');
  if (io) {
    io.emit(event, data);
    
    // Emit low stock alert if quantity is below minimum
    if (event === 'inventoryUpdated' && data.quantity !== undefined && data.minimumQuantity !== undefined) {
      if (data.quantity <= data.minimumQuantity) {
        io.emit('lowStockAlert', {
          item: data,
          message: `Low stock alert: ${data.name} quantity (${data.quantity}) is at or below minimum (${data.minimumQuantity})`
        });
      }
    }
  }
};

// Get all inventory items
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const inventory = readJSON(DB_PATHS.INVENTORY);
  
  res.json({
    success: true,
    items: inventory
  });
}));

// Create inventory item (admin only)
router.post('/', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { name, make, model, specification, rack, bin, quantity, minimumQuantity } = req.body;

  if (!name || !make || !model || !specification || !rack || !bin || quantity === undefined) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  if (quantity < 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity cannot be negative'
    });
  }

  const inventory = readJSON(DB_PATHS.INVENTORY);
  const transactions = readJSON(DB_PATHS.TRANSACTIONS);

  const newItem = {
    id: Math.max(...inventory.map(i => i.id), 0) + 1,
    name,
    make,
    model,
    specification,
    rack,
    bin,
    quantity: parseInt(quantity),
    minimumQuantity: minimumQuantity ? parseInt(minimumQuantity) : 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.username
  };

  inventory.push(newItem);
  
  if (!(await safeWriteJSON(DB_PATHS.INVENTORY, inventory))) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create inventory item'
    });
  }

  // Add transaction
  const transaction = {
    id: Math.max(...transactions.map(t => t.id), 0) + 1,
    itemId: newItem.id,
    itemName: name,
    type: 'added',
    quantity: parseInt(quantity),
    user: req.user.username,
    timestamp: new Date().toISOString()
  };
  
  transactions.push(transaction);
  await safeWriteJSON(DB_PATHS.TRANSACTIONS, transactions);

  // Emit Socket.IO events
  emitInventoryEvent(req, 'inventoryCreated', newItem);
  emitInventoryEvent(req, 'transactionCreated', transaction);

  res.status(201).json({
    success: true,
    item: newItem
  });
}));

// Update inventory item
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const itemId = parseInt(id);

  const inventory = readJSON(DB_PATHS.INVENTORY);
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  if (updates.quantity !== undefined && updates.quantity < 0) {
    return res.status(400).json({
      success: false,
      message: 'Quantity cannot be negative'
    });
  }

  const oldQuantity = inventory[itemIndex].quantity;
  
  inventory[itemIndex] = { 
    ...inventory[itemIndex], 
    ...updates, 
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.username
  };

  if (!(await safeWriteJSON(DB_PATHS.INVENTORY, inventory))) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update inventory item'
    });
  }

  // Add transaction if quantity changed
  let transaction = null;
  if (updates.quantity !== undefined && updates.quantity !== oldQuantity) {
    const transactions = readJSON(DB_PATHS.TRANSACTIONS);
    transaction = {
      id: Math.max(...transactions.map(t => t.id), 0) + 1,
      itemId: itemId,
      itemName: inventory[itemIndex].name,
      type: updates.quantity > oldQuantity ? 'added' : 'taken',
      quantity: Math.abs(updates.quantity - oldQuantity),
      user: req.user.username,
      timestamp: new Date().toISOString()
    };
    
    transactions.push(transaction);
    await safeWriteJSON(DB_PATHS.TRANSACTIONS, transactions);
  }

  // Emit Socket.IO events
  emitInventoryEvent(req, 'inventoryUpdated', inventory[itemIndex]);
  if (transaction) {
    emitInventoryEvent(req, 'transactionCreated', transaction);
  }

  res.json({
    success: true,
    item: inventory[itemIndex]
  });
}));

// Delete inventory item (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const itemId = parseInt(id);

  const inventory = readJSON(DB_PATHS.INVENTORY);
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  const deletedItem = inventory[itemIndex];
  const filteredInventory = inventory.filter(i => i.id !== itemId);
  
  if (!(await safeWriteJSON(DB_PATHS.INVENTORY, filteredInventory))) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item'
    });
  }

  // Add transaction
  const transactions = readJSON(DB_PATHS.TRANSACTIONS);
  const transaction = {
    id: Math.max(...transactions.map(t => t.id), 0) + 1,
    itemId: itemId,
    itemName: deletedItem.name,
    type: 'deleted',
    quantity: deletedItem.quantity,
    user: req.user.username,
    timestamp: new Date().toISOString()
  };
  
  transactions.push(transaction);
  await safeWriteJSON(DB_PATHS.TRANSACTIONS, transactions);

  // Emit Socket.IO events
  const io = req.app.get('io');
  if (io) {
    io.emit('inventoryDeleted', { id: itemId, item: deletedItem });
    io.emit('transactionCreated', transaction);
  }

  res.json({
    success: true,
    message: 'Item deleted successfully'
  });
}));

// Bulk upload inventory items (admin only)
router.post('/bulk-upload', authenticateToken, requireRole(['admin']), upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid Excel file' });
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No data found in file' });
  }
  const inventory = readJSON(DB_PATHS.INVENTORY);
  const transactions = readJSON(DB_PATHS.TRANSACTIONS);
  let addedCount = 0;
  const addedItems = [];
  
  for (const row of rows) {
    const { Name, Make, Model, Specification, Rack, Bin, Quantity, MinimumQuantity } = row;
    if (!Name || !Make || !Model || !Specification || !Rack || !Bin || Quantity === undefined || MinimumQuantity === undefined) {
      continue; // skip incomplete rows
    }
    const newItem = {
      id: Math.max(0, ...inventory.map(i => i.id)) + 1 + addedCount,
      name: Name,
      make: Make,
      model: Model,
      specification: Specification,
      rack: Rack,
      bin: Bin,
      quantity: parseInt(Quantity),
      minimumQuantity: parseInt(MinimumQuantity),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.username
    };
    if (isNaN(newItem.quantity) || isNaN(newItem.minimumQuantity) || newItem.quantity < 0 || newItem.minimumQuantity < 0) {
      continue;
    }
    inventory.push(newItem);
    addedItems.push(newItem);
    
    // Add transaction
    const transaction = {
      id: Math.max(...transactions.map(t => t.id), 0) + 1 + addedCount,
      itemId: newItem.id,
      itemName: newItem.name,
      type: 'added',
      quantity: newItem.quantity,
      user: req.user.username,
      timestamp: new Date().toISOString()
    };
    transactions.push(transaction);
    addedCount++;
  }
  
  if (addedCount > 0) {
    const inventoryWriteSuccess = await safeWriteJSON(DB_PATHS.INVENTORY, inventory);
    const transactionsWriteSuccess = await safeWriteJSON(DB_PATHS.TRANSACTIONS, transactions);
    
    if (!inventoryWriteSuccess || !transactionsWriteSuccess) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to save bulk upload data. Please try again.' 
      });
    }
    
    // Emit Socket.IO events for bulk upload
    const io = req.app.get('io');
    if (io) {
      io.emit('bulkUploadCompleted', {
        count: addedCount,
        items: addedItems
      });
    }
  }
  
  res.json({ success: true, message: `Bulk upload complete. ${addedCount} items added.` });
}));

export default router;