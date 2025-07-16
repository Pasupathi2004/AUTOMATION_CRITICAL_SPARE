import { readJSON, DB_PATHS } from '../config/database.js';
import { connectDB } from '../config/mongodb.js';
import User from '../models/User.js';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';

const migrateData = async () => {
  try {
    console.log('🔄 Starting data migration to MongoDB...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Migrate Users
    console.log('📦 Migrating users...');
    const users = readJSON(DB_PATHS.USERS);
    if (users.length > 0) {
      await User.deleteMany({}); // Clear existing users
      const migratedUsers = await User.insertMany(users);
      console.log(`✅ Migrated ${migratedUsers.length} users`);
    }
    
    // Migrate Inventory
    console.log('📦 Migrating inventory...');
    const inventory = readJSON(DB_PATHS.INVENTORY);
    if (inventory.length > 0) {
      await Inventory.deleteMany({}); // Clear existing inventory
      const migratedInventory = await Inventory.insertMany(inventory);
      console.log(`✅ Migrated ${migratedInventory.length} inventory items`);
    }
    
    // Migrate Transactions
    console.log('📦 Migrating transactions...');
    const transactions = readJSON(DB_PATHS.TRANSACTIONS);
    if (transactions.length > 0) {
      await Transaction.deleteMany({}); // Clear existing transactions
      
      // Update transaction itemId references to MongoDB ObjectIds
      const updatedTransactions = transactions.map(transaction => {
        // Find the corresponding inventory item to get the MongoDB ObjectId
        const inventoryItem = inventory.find(item => item.id === transaction.itemId);
        if (inventoryItem && inventoryItem._id) {
          return {
            ...transaction,
            itemId: inventoryItem._id
          };
        }
        return transaction;
      });
      
      const migratedTransactions = await Transaction.insertMany(updatedTransactions);
      console.log(`✅ Migrated ${migratedTransactions.length} transactions`);
    }
    
    console.log('🎉 Data migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData();
}

export default migrateData; 