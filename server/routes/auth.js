import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username, password);

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  const user = await User.findOne({ username });
  console.log('User found:', user);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Plain text password check
  if (password !== user.password) {
    console.log('Password match:', false);
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
  console.log('Password match:', true);

  // Generate JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const { password: _, ...userWithoutPassword } = user.toObject();

  res.json({
    success: true,
    user: userWithoutPassword,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}));

// Verify token
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  const users = readJSON(DB_PATHS.USERS);
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    user: userWithoutPassword
  });
}));

// Refresh token
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  const token = jwt.sign(
    { 
      id: req.user.id, 
      username: req.user.username, 
      role: req.user.role 
    },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  res.json({
    success: true,
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
}));

export default router;