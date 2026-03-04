const mongoose = require('mongoose');

// Single document store for app-wide config
const appConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.model('AppConfig', appConfigSchema);