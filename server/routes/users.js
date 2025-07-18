import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  const users = await User.find({}, '-password'); // Exclude password field
  // Convert _id to id for frontend compatibility
  const usersWithId = users.map(user => ({
    ...user.toObject(),
    id: user._id.toString()
  }));
  res.json({ success: true, users: usersWithId });
});

// Create user
router.post('/', async (req, res) => {
  try {
    let { password, ...rest } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    // Hash password if not already hashed
    if (!password.startsWith('$2a$')) {
      password = await bcrypt.hash(password, 10);
    }
    const user = new User({ ...rest, password });
    await user.save();
    const userWithId = {
      ...user.toObject(),
      id: user._id.toString()
    };
    res.json({ success: true, user: userWithId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// Count users
router.get('/count', async (req, res) => {
  const count = await User.countDocuments();
  res.json({ success: true, count });
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

export default router;