import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import Request from '../models/Request.js';

export async function migratePlantFields() {
  const updates = await Promise.all([
    Inventory.updateMany({ plant: { $exists: false } }, { $set: { plant: 'plant1' } }),
    Transaction.updateMany({ plant: { $exists: false } }, { $set: { plant: 'plant1' } }),
    Request.updateMany({ plant: { $exists: false } }, { $set: { plant: 'plant1' } }),
  ]);
  const total = updates.reduce((sum, r) => sum + (r.modifiedCount || 0), 0);
  if (total > 0) {
    console.log(`Migrated ${total} records to plant1`);
  }
}
