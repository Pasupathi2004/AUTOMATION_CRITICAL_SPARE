import express from 'express';
import { readJSON, safeWriteJSON, DB_PATHS } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Helper function to emit Socket.IO events
const emitUserEvent = (req, event, data) => {
  const io = req.app.get('io');
  if (io) {
    io.emit(event, data);
  }
};

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const users = readJSON(DB_PATHS.USERS);
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  
  res.json({
    success: true,
    users: usersWithoutPasswords
  });
}));

// Create user (admin only)
router.post('/', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { username, password, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  const users = readJSON(DB_PATHS.USERS);
  
  // Check if username already exists
  if (users.find(u => u.username === username)) {
    return res.status(400).json({
      success: false,
      message: 'Username already exists'
    });
  }

  const newUser = {
    id: Math.max(...users.map(u => u.id), 0) + 1,
    username,
    password, // Store plain text password
    role,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  
  if (!(await safeWriteJSON(DB_PATHS.USERS, users))) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }

  const { password: _, ...userWithoutPassword } = newUser;
  
  // Emit Socket.IO event
  emitUserEvent(req, 'userCreated', userWithoutPassword);

  res.status(201).json({
    success: true,
    user: userWithoutPassword
  });
}));

// Update user password
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const userId = parseInt(id);

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  // Users can only update their own password, unless they're admin
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own password'
    });
  }

  const users = readJSON(DB_PATHS.USERS);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  users[userIndex].password = password; // Store plain text password
  users[userIndex].updatedAt = new Date().toISOString();
  
  if (!writeJSON(DB_PATHS.USERS, users)) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update password'
    });
  }

  const { password: _, ...userWithoutPassword } = users[userIndex];
  
  // Emit Socket.IO event
  emitUserEvent(req, 'userUpdated', userWithoutPassword);

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

// Delete user (admin only, cannot delete self)
router.delete('/:id', authenticateToken, requireRole(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  if (req.user.id === userId) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  const users = readJSON(DB_PATHS.USERS);
  const userToDelete = users.find(u => u.id === userId);
  
  if (!userToDelete) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const filteredUsers = users.filter(u => u.id !== userId);
  
  if (!writeJSON(DB_PATHS.USERS, filteredUsers)) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }

  const { password: _, ...userWithoutPassword } = userToDelete;
  
  // Emit Socket.IO event
  emitUserEvent(req, 'userDeleted', { id: userId, user: userWithoutPassword });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

export default router;