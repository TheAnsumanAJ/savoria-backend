const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['starters', 'mains', 'desserts', 'drinks'], required: true },
  price: { type: Number, required: true },
  description: { type: String },
  emoji: { type: String, default: '🍽️' },
  popular: { type: Boolean, default: false },
  veg: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
