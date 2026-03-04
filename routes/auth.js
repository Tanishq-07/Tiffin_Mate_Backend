const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppConfig = require('../models/AppConfig');

function makeToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function syncMembers() {
  const users = await User.find({ role: 'member' }).select('name');
  const members = users.map((u) => u.name);
  await AppConfig.findOneAndUpdate(
    { key: 'members' },
    { value: members },
    { upsert: true }
  );
}

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const user = await User.findOne({ name });
    if (!user) return res.status(401).json({ error: 'Invalid name or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid name or password' });

    res.json({ token: makeToken(user), name: user.name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/register — self signup, auto-added to tiffin members
router.post('/register', async (req, res) => {
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

    res.status(201).json({ token: makeToken(user), name: user.name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;