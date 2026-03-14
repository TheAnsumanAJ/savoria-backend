const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  emoji: { type: String }
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userEmail: { type: String, required: true, lowercase: true },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  type: { type: String, enum: ['delivery', 'table_order'], default: 'delivery' },
  tableNumber: { type: Number, default: null },
  address: { type: String, default: '' },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Processing', 'Ready', 'Delivered', 'Cancelled'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
