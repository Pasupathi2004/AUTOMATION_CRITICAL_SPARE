# 📧 Weekly Low Stock Email Setup Guide

## Overview

Your inventory system now automatically sends weekly email alerts for low stock items every **Monday at 9:00 AM IST**.

## Features

✅ **Automatic Weekly Emails** - Sent every Monday at 9:00 AM IST  
✅ **Beautiful HTML Email** - Professional design with item details  
✅ **Complete Item Information** - Name, Make, Model, Specification, Location, Quantity  
✅ **Status Indicators** - Out of Stock, Critical, Low Stock  
✅ **Multiple Recipients** - Send to multiple email addresses  
✅ **Manual Send Option** - Send emails on-demand from the system  

## Setup Instructions

### Step 1: Configure Email Settings

Create a `.env` file in your project root with these variables:

```env
# Email Configuration (Gmail example)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here

# Recipients for weekly low stock alerts (comma-separated)
EMAIL_RECIPIENTS=manager@company.com,stock@company.com,purchasing@company.com

# Other configurations
JWT_SECRET=your-secret-key
MONGO_URI=mongodb://localhost:27017/inventory-management
```

### Step 2: Gmail Setup (Recommended)

If using Gmail:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Click "Generate"
   - Copy the 16-character password
   - Use this password in `EMAIL_PASSWORD` (not your regular Gmail password)

### Step 3: Other Email Providers

#### For Outlook/Hotmail:
```env
EMAIL_SERVICE=hotmail
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### For Custom SMTP:
```env
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
```

### Step 4: Test Email Configuration

Test your email setup:

**Option A: Using API (once server is running)**
```bash
# Send test email
curl -X POST http://localhost:3001/api/emails/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail": "test@example.com"}'
```

**Option B: From Postman/Browser**
```json
POST http://localhost:3001/api/emails/test
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json

Body:
{
  "recipientEmail": "test@example.com"
}
```

### Step 5: Start the Server

```bash
cd C:\Users\Tdconnex\AUTOMATION_CRITICAL_SPARE\server
npm start
```

You should see:
```
📅 Starting email scheduler...
✅ Email scheduler started
📧 Weekly emails will be sent every Monday at 9:00 AM IST
📧 Recipients: manager@company.com, stock@company.com
```

## Email Schedule

- **Frequency**: Weekly (Every Monday)
- **Time**: 9:00 AM IST
- **Timezone**: Asia/Kolkata

## Email Content

The email includes:

1. **Summary Section**:
   - Total low stock items
   - Critical items count
   - Low stock items count

2. **Item Details Table**:
   - Item Name
   - Make/Model
   - Location (Row-Column)
   - Quantity
   - Status (Out of Stock/Critical/Low Stock)

3. **Professional Design**:
   - Color-coded status indicators
   - Mobile-responsive layout
   - Branded header

## API Endpoints

### 1. Send Low Stock Email Manually

**Endpoint**: `POST /api/emails/send-low-stock`

**Headers**:
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "recipientEmails": [
    "manager@company.com",
    "stock@company.com"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Low stock email sent successfully",
  "recipients": ["manager@company.com", "stock@company.com"],
  "itemsCount": 5
}
```

### 2. Send Test Email

**Endpoint**: `POST /api/emails/test`

**Body**:
```json
{
  "recipientEmail": "test@example.com"
}
```

### 3. Get Low Stock Items

**Endpoint**: `GET /api/emails/low-stock`

**Response**:
```json
{
  "success": true,
  "count": 5,
  "items": [
    {
      "name": "Motor Controller",
      "make": "Siemens",
      "model": "SIMATIC S7-1200",
      "quantity": 2,
      "minimumQuantity": 10,
      ...
    }
  ]
}
```

## Troubleshooting

### Email Not Sending

1. **Check Configuration**:
   ```bash
   # Verify environment variables are set
   echo $EMAIL_USER
   echo $EMAIL_PASSWORD
   ```

2. **Check Server Logs**:
   ```bash
   # Look for email-related messages
   npm start
   ```

3. **Common Issues**:
   - ❌ **"Less secure app access"** - Use App Passwords instead
   - ❌ **"Invalid credentials"** - Check email and password
   - ❌ **"Connection timeout"** - Check firewall/proxy settings
   - ❌ **"Email not configured"** - Set EMAIL_USER and EMAIL_PASSWORD

### Test Email First

Always send a test email before relying on automatic weekly emails:

```bash
POST /api/emails/test
{
  "recipientEmail": "your-email@example.com"
}
```

### Check Scheduler Status

The scheduler logs show:
- ✅ When emails are scheduled
- ✅ When emails are sent
- ✅ Any errors during sending
- ✅ Recipient email addresses

## Example Email Output

```
Subject: 🔔 Weekly Low Stock Alert - 5 Item(s) Need Attention

📊 Summary: You have 5 item(s) requiring attention.
🚨 Critical: 2 item(s) are out of stock
⚠️ Low Stock: 3 item(s) need restocking

Items Requiring Attention:
┌────────────────────┬──────────────────┬─────────────┬──────────┬──────────────┐
│ Item Name          │ Make/Model       │ Location    │ Quantity │ Status       │
├────────────────────┼──────────────────┼─────────────┼──────────┼──────────────┤
│ Motor Controller   │ Siemens SIMATIC  │ Row A-3     │ 0        │ OUT OF STOCK │
│ Relay Switch       │ ABB 24V DC       │ Row B-5     │ 2        │ CRITICAL     │
│ ...                │ ...              │ ...         │ ...      │ ...          │
└────────────────────┴──────────────────┴─────────────┴──────────┴──────────────┘

Generated on: Monday, January 15, 2024
```

## Notes

- ✅ Emails are sent **automatically** every week
- ✅ No low stock items? Email is skipped (not sent)
- ✅ Only items with `quantity <= minimumQuantity` are included
- ✅ HTML email design works on all email clients
- ✅ Owner-only: Only users with 'pasu' username or 'owner' role can send manual emails

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify email configuration in `.env` file
3. Test email connection first
4. Ensure email provider allows SMTP access

---

**🎉 Setup Complete!** Your low stock alerts will now be sent automatically every Monday at 9:00 AM IST.

