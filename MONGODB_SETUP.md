# MongoDB Setup Guide

## Option 1: MongoDB Atlas (Cloud - Recommended for Quick Setup)

### Steps:
1. **Create MongoDB Atlas Account**: 
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free account

2. **Create a Cluster**:
   - Click "Create Cluster"
   - Choose "FREE" tier
   - Select your preferred region
   - Wait for cluster to be created (1-3 minutes)

3. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Replace `<dbname>` with your database name (e.g., `inventory-management`)

4. **Set Environment Variable**:
   ```bash
   # In your project root, create a .env file:
   MONGO_URI=your-atlas-connection-string-here
   JWT_SECRET=your-secret-key-here
   ```

## Option 2: Local MongoDB Installation

### Windows Installation:
1. **Download MongoDB**: 
   - Go to https://www.mongodb.com/try/download/community
   - Download the Windows version

2. **Install MongoDB**:
   - Run the installer
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service"
   - Install MongoDB Compass (GUI tool)

3. **Start MongoDB Service**:
   ```powershell
   # MongoDB should start automatically as a service
   # Verify with:
   net start MongoDB
   ```

4. **Connection**:
   - MongoDB will be available at: `mongodb://localhost:27017`
   - The application is already configured to use this

## Option 3: Use Existing JSON File Database

If you want to continue using JSON files (current setup), the application is already configured and working. Just run:

```bash
npm run dev  # Frontend
cd server && npm start  # Backend
```

The application will work with JSON files stored in `server/data/` folder.

## Current Status

✅ **Transaction Model**: Enhanced with make, model, specification, rack, bin
✅ **Transaction Creation**: Stores full item specifications
✅ **Analytics Display**: Shows comprehensive item details
✅ **Excel Reports**: Includes all specifications
✅ **Server Configuration**: Ready for both MongoDB and JSON files

## Next Steps

1. Choose your preferred database option (Atlas, Local, or JSON)
2. If using MongoDB, install and configure
3. Restart the server
4. Test the enhanced analytics features
