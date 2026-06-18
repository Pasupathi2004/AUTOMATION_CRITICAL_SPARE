import cron from 'node-cron';
import Inventory from '../models/Inventory.js';
import { PLANTS } from '../constants/plants.js';
import { sendLowStockEmail } from '../utils/emailService.js';

// Weekly email recipient list
// Add your email addresses here
const RECIPIENT_EMAILS = process.env.EMAIL_RECIPIENTS ? 
  process.env.EMAIL_RECIPIENTS.split(',').map(email => email.trim()) : 
  []; // Default empty array

// Schedule weekly email every Monday at 9:00 AM
const WEEKLY_EMAIL_SCHEDULE = '0 9 * * 1'; // Cron expression: Every Monday at 9:00 AM

// Schedule daily email at 9:00 AM (for testing)
const DAILY_EMAIL_SCHEDULE = '0 9 * * *'; // Cron expression: Daily at 9:00 AM

let weeklyEmailJob = null;

// Get low stock items
const getLowStockItems = async () => {
  try {
    const allItems = [];
    for (const plant of PLANTS) {
      const inventory = await Inventory(plant).find();
      const lowStock = inventory
        .filter(i => i.quantity <= i.minimumQuantity)
        .map((item) => ({ ...item.toObject(), plant }));
      allItems.push(...lowStock);
    }
    return allItems;
  } catch (error) {
    console.error('❌ Error fetching low stock items:', error);
    return [];
  }
};

// Send weekly low stock email
const sendWeeklyLowStockEmail = async () => {
  try {
    if (RECIPIENT_EMAILS.length === 0) {
      console.log('⚠️ No recipient emails configured for weekly low stock alerts');
      return;
    }

    console.log('📧 Starting weekly low stock email job...');
    const lowStockItems = await getLowStockItems();
    
    if (lowStockItems.length === 0) {
      console.log('✅ No low stock items found. Skipping email.');
      return;
    }

    console.log(`📊 Found ${lowStockItems.length} low stock item(s)`);
    const result = await sendLowStockEmail(lowStockItems, RECIPIENT_EMAILS);
    
    if (result.success) {
      console.log('✅ Weekly low stock email sent successfully');
    } else {
      console.error('❌ Failed to send weekly low stock email:', result.message);
    }
  } catch (error) {
    console.error('❌ Error in weekly email job:', error);
  }
};

// Start weekly email scheduler
export const startEmailScheduler = () => {
  console.log('📅 Starting email scheduler...');

  // Weekly email job (every Monday at 9:00 AM)
  weeklyEmailJob = cron.schedule(WEEKLY_EMAIL_SCHEDULE, async () => {
    console.log('⏰ Weekly email job triggered');
    await sendWeeklyLowStockEmail();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  console.log('✅ Email scheduler started');
  console.log(`📧 Weekly emails will be sent every Monday at 9:00 AM IST`);
  console.log(`📧 Recipients: ${RECIPIENT_EMAILS.join(', ') || 'None configured'}`);
};

// Stop email scheduler
export const stopEmailScheduler = () => {
  if (weeklyEmailJob) {
    weeklyEmailJob.stop();
    console.log('🛑 Email scheduler stopped');
  }
};

// Get scheduler status
export const getSchedulerStatus = () => {
  return {
    running: weeklyEmailJob !== null,
    schedule: WEEKLY_EMAIL_SCHEDULE,
    recipients: RECIPIENT_EMAILS,
    description: 'Every Monday at 9:00 AM IST'
  };
};

