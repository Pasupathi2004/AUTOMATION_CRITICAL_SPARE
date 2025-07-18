import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  const users = await User.find({}, '-password'); // Exclude password field
  res.json({ success: true, users });
});

// Create user
router.post('/', async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.json({ success: true, user });
});

// Count users
router.get('/count', async (req, res) => {
  const count = await User.countDocuments();
  res.json({ success: true, count });
});

export default router;