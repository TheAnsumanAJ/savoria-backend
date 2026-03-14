const Order = require('../models/Order');
const Reservation = require('../models/Reservation');

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { userEmail, reservationId, name, email, phone, items, total, type, tableNumber, address, notes } = req.body;

    if (!name || !email || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const order = await Order.create({
      userEmail: (userEmail || email).toLowerCase(),
      reservationId: reservationId || null,
      name,
      email,
      phone,
      items,
      total,
      type: type || 'delivery',
      tableNumber: tableNumber || null,
      address: address || '',
      notes: notes || '',
      status: 'Pending'
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

// GET /api/orders/user/:email
const getOrdersByUser = async (req, res) => {
  try {
    const orders = await Order.find({ userEmail: req.params.email.toLowerCase() }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// GET /api/orders/reservation/:id
const getOrdersByReservation = async (req, res) => {
  try {
    const orders = await Order.find({ reservationId: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders for reservation' });
  }
};

// GET /api/orders (manager — all orders)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// PATCH /api/orders/:id/status  (manager update)
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

// DELETE /api/orders/:id
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};

module.exports = { createOrder, getOrdersByUser, getOrdersByReservation, getAllOrders, updateOrderStatus, cancelOrder };
