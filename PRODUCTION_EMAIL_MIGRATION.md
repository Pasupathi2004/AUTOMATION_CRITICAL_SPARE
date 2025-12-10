# 📧 Production Email Setup Without Data Loss

## Overview
This guide helps you configure email settings in your production environment (deployed on GitHub, Render, Vercel, MongoDB Atlas) without losing any existing data.

## ✅ Safe Migration Steps

### Step 1: Add Environment Variables

#### For Render Deployment:
1. Go to your **Render Dashboard**
2. Select your service (backend server)
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add these variables:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_RECIPIENTS=production-email1@company.com,production-email2@company.com
```

6. Click **Save Changes**
7. Your service will **automatically restart** with new settings

#### For Vercel Deployment:
1. Go to **Vercel Dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add each variable:
   - Key: `EMAIL_SERVICE` → Value: `gmail`
   - Key: `EMAIL_USER` → Value: your email
   - Key: `EMAIL_PASSWORD` → Value: your app password
   - Key: `EMAIL_RECIPIENTS` → Value: comma-separated emails
6. Select **All Environments** (Production, Preview, Development)
7. Click **Save**

#### For MongoDB Atlas:
1. Go to **MongoDB Atlas Dashboard**
2. Your database is already connected
3. **No changes needed** - MongoDB is separate from email
4. Your existing data remains safe

### Step 2: Restart Services

#### On Render:
- Render automatically restarts when you save environment variables
- Wait 1-2 minutes for deployment to complete
- Check logs: `Logs` tab in Render dashboard

#### On Vercel:
- Vercel automatically deploys when you save environment variables
- Check deployment status in dashboard
- Usually completes in 30-60 seconds

### Step 3: Verify Email Configuration

Test your production email:

```bash
# Using curl or Postman
POST https://your-production-domain.com/api/emails/test
Headers:
  Authorization: Bearer YOUR_PRODUCTION_TOKEN
  Content-Type: application/json

Body:
{
  "recipientEmail": "test@example.com"
}
```

## 🔒 Data Safety Guarantees

### ✅ What WILL NOT Change:
- ✅ **All inventory items** - No changes
- ✅ **All transactions** - Safe and preserved
- ✅ **All users** - Safe and preserved
- ✅ **All analytics data** - Safe and preserved
- ✅ **MongoDB database** - No changes
- ✅ **All configurations** - Except email settings
- ✅ **Current stock levels** - Safe
- ✅ **Transaction history** - Safe

### ⚙️ What WILL Change:
- ✨ **Email recipients** - Will change to production emails
- ✨ **Email sender** - Will change to production email
- ✨ **Email notifications** - Will start sending to production addresses

## 📊 Complete Environment Variable Setup

### Production Environment Variables

```env
# Database (MongoDB Atlas - already configured)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database

# Email Configuration (NEW - Add these)
EMAIL_SERVICE=gmail
EMAIL_USER=production-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password-16-characters
EMAIL_RECIPIENTS=manager@company.com,purchasing@company.com,stock@company.com

# Application Security (already configured)
JWT_SECRET=your-production-secret-key-here
NODE_ENV=production
CORS_ORIGIN=https://your-production-domain.vercel.app

# Server Configuration (already configured)
PORT=3001
```

## 🧪 Testing Production Email

### Test 1: Send Test Email
```bash
curl -X POST https://your-api.render.com/api/emails/test \
  -H "Authorization: Bearer YOUR_PRODUCTION_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail": "your-email@example.com"}'
```

### Test 2: Send Low Stock Email Manually
```bash
curl -X POST https://your-api.render.com/api/emails/send-low-stock \
  -H "Authorization: Bearer YOUR_PRODUCTION_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmails": ["test@example.com"]
  }'
```

### Test 3: Check Low Stock Items
```bash
curl -X GET https://your-api.render.com/api/emails/low-stock \
  -H "Authorization: Bearer YOUR_PRODUCTION_JWT_TOKEN"
```

## 🎯 Gmail App Password Setup (Production)

### Step-by-Step:
1. **Go to**: https://myaccount.google.com/security
2. **Enable 2-Step Verification** if not already enabled
3. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" → "Other (Custom name)"
   - Enter name: "Production Inventory App"
   - Click **Generate**
   - **Copy the 16-character password** (spaces don't matter)
4. **Use this password** in `EMAIL_PASSWORD` environment variable

⚠️ **Important**: Never use your regular Gmail password - always use App Password

## 📅 Production Email Schedule

After setup, emails will be sent:
- ✅ **Every Monday at 9:00 AM IST** (automatically)
- ✅ **Only if there are low stock items**
- ✅ **To all recipients** in EMAIL_RECIPIENTS
- ✅ **With complete item details**

## 🔍 Verification Checklist

After deploying email settings, verify:

- [ ] Environment variables added successfully
- [ ] Service restarted without errors
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] All inventory data intact
- [ ] All transactions preserved
- [ ] No errors in server logs
- [ ] Scheduler logs showing "Email scheduler started"

## 🆘 Troubleshooting Production Issues

### Issue 1: "Email not configured"
**Solution**: 
- Check environment variables are set in production
- Verify variable names are exact (case-sensitive)
- Restart service after adding variables

### Issue 2: "Authentication failed"
**Solution**:
- Use App Password, not regular Gmail password
- Check email username is correct
- Ensure 2-Step Verification is enabled

### Issue 3: "Cannot connect to SMTP"
**Solution**:
- Check firewall allows SMTP (port 587 or 465)
- Try different EMAIL_SERVICE value
- Check internet connectivity from server

### Issue 4: No emails received
**Solution**:
- Check spam/junk folder
- Verify recipient email is correct
- Check server logs for errors
- Send test email first to verify

### Issue 5: Data loss concerns
**Solution**:
- **MongoDB data is completely safe** - no database changes
- Environment variables don't affect existing data
- Only email recipients change
- Your inventory and transactions remain untouched

## 📋 Deployment Architecture

```
Production Setup:
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Frontend (Vercel)                                      │
│  ├─ React App                                           │
│  ├─ Environment: Production                             │
│  └─ URL: https://your-app.vercel.app                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Backend (Render)                                       │
│  ├─ Node.js Server                                      │
│  ├─ Environment Variables                               │
│  │  ├─ MONGO_URI (connected to Atlas)                  │
│  │  ├─ EMAIL_SERVICE                                   │
│  │  ├─ EMAIL_USER                                      │
│  │  ├─ EMAIL_PASSWORD                                  │
│  │  └─ EMAIL_RECIPIENTS                                │
│  ├─ Email Scheduler (Weekly)                           │
│  └─ URL: https://your-api.render.com                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Database (MongoDB Atlas)                               │
│  ├─ Cluster: Your production cluster                   │
│  ├─ Collections:                                        │
│  │  ├─ inventory (all items)                           │
│  │  ├─ transactions (all history)                      │
│  │  └─ users (all users)                               │
│  └─ ✅ NO CHANGES NEEDED                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Email Service (Gmail)                                  │
│  ├─ Sender: production-email@gmail.com                 │
│  ├─ Recipients: Your configured emails                 │
│  ├─ Schedule: Every Monday 9:00 AM IST                 │
│  └─ ✅ NEW - Email sending enabled                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## ✅ Final Verification

After completing setup:

1. ✅ **Check Database**: All data intact
   ```bash
   GET https://your-api.com/api/inventory
   # Should show all items
   ```

2. ✅ **Check Transactions**: All history preserved
   ```bash
   GET https://your-api.com/api/transactions
   # Should show all transactions
   ```

3. ✅ **Test Email**: Send test email successfully
   ```bash
   POST https://your-api.com/api/emails/test
   # Should send email
   ```

4. ✅ **Check Logs**: No errors in deployment logs

## 🎉 Success Criteria

You'll know setup is successful when:
- ✅ Test email received in your inbox
- ✅ Server logs show "Email scheduler started"
- ✅ All inventory data visible in app
- ✅ All transactions history intact
- ✅ No errors in server logs
- ✅ Weekly emails scheduled for Mondays 9:00 AM IST

## 📞 Need Help?

If you encounter issues:
1. Check server logs in Render/Vercel dashboard
2. Verify environment variables are set correctly
3. Test email connection first
4. Check MongoDB Atlas connection is still working
5. Verify all data is still accessible in your app

---

**🎊 Congratulations!** Your production email system is now configured without any data loss!
