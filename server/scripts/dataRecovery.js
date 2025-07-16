import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJSON, safeWriteJSON, checkDataIntegrity, DB_PATHS } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataRecovery = async () => {
  try {
    console.log('🔍 Starting data recovery process...');
    
    // Check current data integrity
    const integrity = checkDataIntegrity();
    console.log('📊 Current data integrity status:', integrity);
    
    // Check for corrupted files and restore from backups
    for (const [key, filePath] of Object.entries(DB_PATHS)) {
      const backupPath = filePath.replace('.json', '.backup.json');
      
      try {
        // Try to read the main file
        const data = readJSON(filePath);
        console.log(`✅ ${key}: Valid data with ${data.length} records`);
      } catch (error) {
        console.log(`❌ ${key}: Corrupted or invalid data`);
        
        // Try to restore from backup
        if (fs.existsSync(backupPath)) {
          console.log(`🔄 Attempting to restore ${key} from backup...`);
          try {
            fs.copyFileSync(backupPath, filePath);
            const restoredData = readJSON(filePath);
            console.log(`✅ Successfully restored ${key} with ${restoredData.length} records`);
          } catch (restoreError) {
            console.error(`❌ Failed to restore ${key}:`, restoreError.message);
          }
        } else {
          console.log(`⚠️ No backup found for ${key}`);
        }
      }
    }
    
    // Final integrity check
    const finalIntegrity = checkDataIntegrity();
    console.log('📊 Final data integrity status:', finalIntegrity);
    
    // Create fresh backups
    console.log('💾 Creating fresh backups...');
    for (const [key, filePath] of Object.entries(DB_PATHS)) {
      try {
        const data = readJSON(filePath);
        const backupPath = filePath.replace('.json', '.backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
        console.log(`✅ Backup created for ${key}`);
      } catch (error) {
        console.error(`❌ Failed to create backup for ${key}:`, error.message);
      }
    }
    
    console.log('🎉 Data recovery process completed!');
    
  } catch (error) {
    console.error('❌ Data recovery failed:', error);
  }
};

// Export for use in other modules
export default dataRecovery;

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  dataRecovery();
} 