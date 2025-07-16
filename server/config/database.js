import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file paths
export const DB_PATHS = {
  USERS: path.join(__dirname, '..', 'data', 'users.json'),
  INVENTORY: path.join(__dirname, '..', 'data', 'inventory.json'),
  TRANSACTIONS: path.join(__dirname, '..', 'data', 'transactions.json')
};

// Backup file paths
export const BACKUP_PATHS = {
  USERS: path.join(__dirname, '..', 'data', 'users.backup.json'),
  INVENTORY: path.join(__dirname, '..', 'data', 'inventory.backup.json'),
  TRANSACTIONS: path.join(__dirname, '..', 'data', 'transactions.backup.json')
};

// File locks to prevent concurrent access
const fileLocks = new Map();

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper function to acquire file lock
const acquireLock = (filename) => {
  if (fileLocks.has(filename)) {
    return false; // File is locked
  }
  fileLocks.set(filename, true);
  return true;
};

// Helper function to release file lock
const releaseLock = (filename) => {
  fileLocks.delete(filename);
};

// Helper function to create backup
const createBackup = (filename) => {
  try {
    if (fs.existsSync(filename)) {
      const backupPath = filename.replace('.json', '.backup.json');
      fs.copyFileSync(filename, backupPath);
      return true;
    }
  } catch (error) {
    console.error(`Error creating backup for ${filename}:`, error);
  }
  return false;
};

// Helper function to restore from backup
const restoreFromBackup = (filename) => {
  try {
    const backupPath = filename.replace('.json', '.backup.json');
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, filename);
      console.log(`Restored ${filename} from backup`);
      return true;
    }
  } catch (error) {
    console.error(`Error restoring backup for ${filename}:`, error);
  }
  return false;
};

// Enhanced readJSON with validation and backup recovery
export const readJSON = (filename, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (!fs.existsSync(filename)) {
        return [];
      }
      
      const data = fs.readFileSync(filename, 'utf8');
      if (!data.trim()) {
        return [];
      }
      
      const parsed = JSON.parse(data);
      
      // Validate that parsed data is an array
      if (!Array.isArray(parsed)) {
        console.error(`Invalid data format in ${filename}, expected array`);
        if (attempt === maxRetries - 1) {
          return [];
        }
        continue;
      }
      
      return parsed;
    } catch (error) {
      console.error(`Error reading ${filename} (attempt ${attempt + 1}):`, error);
      
      if (attempt === maxRetries - 1) {
        // Try to restore from backup on final attempt
        if (restoreFromBackup(filename)) {
          try {
            const data = fs.readFileSync(filename, 'utf8');
            return JSON.parse(data);
          } catch (backupError) {
            console.error(`Failed to read from backup ${filename}:`, backupError);
          }
        }
        return [];
      }
      
      // Wait before retry
      setTimeout(() => {}, 100 * (attempt + 1));
    }
  }
  return [];
};

// Enhanced writeJSON with atomic writes and validation
export const writeJSON = (filename, data, maxRetries = 3) => {
  // Validate data before writing
  if (!Array.isArray(data)) {
    console.error(`Invalid data format for ${filename}, expected array`);
    return false;
  }
  
  // Acquire file lock
  if (!acquireLock(filename)) {
    console.error(`File ${filename} is locked, cannot write`);
    return false;
  }
  
  try {
    // Create backup before writing
    createBackup(filename);
    
    // Write to temporary file first (atomic write)
    const tempFile = `${filename}.tmp`;
    const jsonString = JSON.stringify(data, null, 2);
    
    fs.writeFileSync(tempFile, jsonString, 'utf8');
    
    // Validate the written data
    const validationData = fs.readFileSync(tempFile, 'utf8');
    const validationParsed = JSON.parse(validationData);
    
    if (!Array.isArray(validationParsed)) {
      throw new Error('Validation failed: written data is not an array');
    }
    
    // Atomically move temp file to target file
    fs.renameSync(tempFile, filename);
    
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    
    // Clean up temp file if it exists
    const tempFile = `${filename}.tmp`;
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.error(`Error cleaning up temp file ${tempFile}:`, cleanupError);
      }
    }
    
    return false;
  } finally {
    // Always release the lock
    releaseLock(filename);
  }
};

// Safe write with retry mechanism
export const safeWriteJSON = async (filename, data, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (writeJSON(filename, data)) {
      return true;
    }
    
    if (attempt < maxRetries - 1) {
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }
  
  return false;
};

// Data integrity check
export const checkDataIntegrity = () => {
  const results = {};
  
  for (const [key, path] of Object.entries(DB_PATHS)) {
    try {
      const data = readJSON(path);
      results[key] = {
        valid: Array.isArray(data),
        count: Array.isArray(data) ? data.length : 0,
        hasBackup: fs.existsSync(path.replace('.json', '.backup.json'))
      };
    } catch (error) {
      results[key] = {
        valid: false,
        error: error.message,
        hasBackup: fs.existsSync(path.replace('.json', '.backup.json'))
      };
    }
  }
  
  return results;
};

// Initialize default data with enhanced error handling
export const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...');
    
    // Initialize users with default admin
    if (!fs.existsSync(DB_PATHS.USERS)) {
      const defaultUsers = [
        {
          id: 1,
          username: 'pasu',
          password: '123',
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      ];
      
      if (await safeWriteJSON(DB_PATHS.USERS, defaultUsers)) {
        console.log('✅ Default admin user created: username=pasu, password=123');
      } else {
        console.error('❌ Failed to create default users');
      }
    }

    // Initialize empty inventory
    if (!fs.existsSync(DB_PATHS.INVENTORY)) {
      if (await safeWriteJSON(DB_PATHS.INVENTORY, [])) {
        console.log('✅ Inventory file initialized');
      } else {
        console.error('❌ Failed to initialize inventory file');
      }
    }

    // Initialize empty transactions
    if (!fs.existsSync(DB_PATHS.TRANSACTIONS)) {
      if (await safeWriteJSON(DB_PATHS.TRANSACTIONS, [])) {
        console.log('✅ Transactions file initialized');
      } else {
        console.error('❌ Failed to initialize transactions file');
      }
    }
    
    // Check data integrity
    const integrity = checkDataIntegrity();
    console.log('📊 Data integrity check:', integrity);
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
};