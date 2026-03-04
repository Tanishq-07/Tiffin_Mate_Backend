const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Tanishq', 'Ansh', 'Akshat', 'Praful'],
  },
  time: {
    type: String,
    required: true,
    enum: ['morning', 'night'],
  },
  type: {
    type: String,
    required: true,
    enum: ['full', 'half'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);