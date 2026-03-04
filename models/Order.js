const mongoose = require('mongoose');
const { MEMBERS } = require('../config');

const orderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: MEMBERS,
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