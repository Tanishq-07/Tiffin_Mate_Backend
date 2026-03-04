const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const AppConfig = require('../models/AppConfig');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access only' });
  next();
});

// Helper — sync members list in AppConfig to match current member users
async function syncMembers() {
  const users = await User.find({ role: 'member' }).select('name');
  const members = users.map((u) => u.name);
  await AppConfig.findOneAndUpdate(
    { key: 'members' },
    { value: members },
    { upsert: true }
  );
  return members;
}

// ── Prices ────────────────────────────────────────────

// GET /admin/config
router.get('/config', async (req, res) => {
  try {
    const pricesDoc = await AppConfig.findOne({ key: 'prices' });
    const members = await syncMembers(); // always fresh from users
    res.json({
      members,
      prices: pricesDoc?.value || { full: 80, half: 40 },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/config/prices
router.put('/config/prices', async (req, res) => {
  try {
    const { full, half } = req.body;
    if (typeof full !== 'number' || typeof half !== 'number')
      return res.status(400).json({ error: 'full and half must be numbers' });
    await AppConfig.findOneAndUpdate(
      { key: 'prices' },
      { value: { full, half } },
      { upsert: true }
    );
    res.json({ message: 'Prices updated', prices: { full, half } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Users (= Tiffin Members) ──────────────────────────

// GET /admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'member' }).select('name role createdAt');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/users — creates user AND adds to members
router.post('/users', async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name?.trim() || !password?.trim())
      return res.status(400).json({ error: 'Name and password are required' });

    const exists = await User.findOne({ name: name.trim() });
    if (exists) return res.status(409).json({ error: 'Name already taken' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), password: hash, role: 'member' });

    // Auto-sync members
    await syncMembers();

    res.status(201).json({
      message: 'User created and added to tiffin members',
      user: { name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/users/:name — removes user AND removes from members
router.delete('/users/:name', async (req, res) => {
  try {
    const deleted = await User.findOneAndDelete({ name: req.params.name, role: 'member' });
    if (!deleted) return res.status(404).json({ error: 'User not found' });

    // Auto-sync members
    await syncMembers();

    res.json({ message: 'User removed from app and tiffin members' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;