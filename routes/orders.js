const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const AppConfig = require('../models/AppConfig');
const authMiddleware = require('../middleware/auth');

async function getConfig() {
  const [membersDoc, pricesDoc] = await Promise.all([
    AppConfig.findOne({ key: 'members' }),
    AppConfig.findOne({ key: 'prices' }),
  ]);
  return {
    members: membersDoc?.value || [],
    prices: pricesDoc?.value || { full: 80, half: 40 },
  };
}

// POST /orders — members only
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin')
      return res.status(403).json({ error: 'Admins cannot place orders' });

    const { time, type, date } = req.body;
    const name = req.user.name;
    const orderDate = date ? new Date(date) : new Date();

    const dayStart = new Date(orderDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(orderDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await Order.findOne({
      name, time, type,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (existing)
      return res.status(409).json({
        error: `You already have a ${time} ${type} tiffin on this day.`,
      });

    const order = new Order({ name, time, type, date: orderDate });
    await order.save();
    res.status(201).json({ message: 'Order saved', order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /orders/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders/summary
// — admin sees everyone
// — member sees only themselves
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const { members, prices } = await getConfig();
    const isAdmin = req.user.role === 'admin';

    // Strictly enforce: members only see their own orders at DB level
    const orderQuery = {
      date: { $gte: start, $lt: end },
      name: isAdmin ? { $in: members } : req.user.name,
    };

    const orders = await Order.find(orderQuery).sort({ date: 1 });

    // visibleMembers strictly controls what appears in response
    const visibleMembers = isAdmin ? members : [req.user.name];

    const summary = {};
    visibleMembers.forEach((n) => {
      summary[n] = { full: 0, half: 0, total: 0, orders: [] };
    });

    orders.forEach((order) => {
      // Only add to summary if in visibleMembers — never leak other users
      if (!summary[order.name]) return;
      summary[order.name][order.type] += 1;
      summary[order.name].total += prices[order.type] || 0;
      summary[order.name].orders.push({
        _id: order._id,
        date: order.date,
        type: order.type,
        time: order.time,
      });
    });

    res.json({ month, year, summary, prices, members: visibleMembers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;