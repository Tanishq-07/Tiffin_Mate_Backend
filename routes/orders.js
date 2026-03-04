const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { MEMBERS, PRICES } = require('../config');

// POST /orders
router.post('/', async (req, res) => {
  try {
    const { name, time, type, date } = req.body;
    const orderDate = date ? new Date(date) : new Date();

    const dayStart = new Date(orderDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(orderDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await Order.findOne({
      name, time, type,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (existing) {
      return res.status(409).json({
        error: `${name} already has a ${time} ${type} tiffin on this day.`,
      });
    }

    const order = new Order({ name, time, type, date: orderDate });
    await order.save();
    res.status(201).json({ message: 'Order saved', order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /orders/summary?month=4&year=2025
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const orders = await Order.find({ date: { $gte: start, $lt: end } }).sort({ date: 1 });

    const summary = {};
    MEMBERS.forEach((n) => { summary[n] = { full: 0, half: 0, total: 0, orders: [] }; });

    orders.forEach((order) => {
      if (summary[order.name]) {
        summary[order.name][order.type] += 1;
        summary[order.name].total += PRICES[order.type];
        summary[order.name].orders.push({
          date: order.date,
          type: order.type,
          time: order.time,
        });
      }
    });

    res.json({ month, year, summary, prices: PRICES });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;