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

    // Real-time: Notify managers about new order
    const io = req.app.get('io');
    if (io) {
      io.to('managers').emit('new-order-alert', { orderId: order._id, customer: name });
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order' });
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
    const reservationId = req.params.id;
    // 1. Try finding by reservationId directly
    let orders = await Order.find({ reservationId }).sort({ createdAt: 1 });
    
    // 2. Fallback: If no orders linked by ID, find by table + email + date of reservation
    if (orders.length === 0) {
      const reservation = await Reservation.findById(reservationId);
      if (reservation) {
        // Find orders for this table and user on the same date (within 12 hours)
        const dateStart = new Date(reservation.date);
        dateStart.setHours(0,0,0,0);
        const dateEnd = new Date(reservation.date);
        dateEnd.setHours(23,59,59,999);

        orders = await Order.find({
          tableNumber: reservation.tableNumber,
          userEmail: reservation.email,
          createdAt: { $gte: dateStart, $lte: dateEnd },
          type: 'table_order'
        }).sort({ createdAt: 1 });
      }
    }

    res.json(orders);
  } catch (err) {
    console.error('Fetch reservation orders error:', err);
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

    // Real-time: Notify specific user about status update
    const io = req.app.get('io');
    if (io) {
      io.to(order.userEmail).emit('order-status-update', { orderId: order._id, status: order.status });
    }

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

module.exports = { createOrder, getOrderById, getOrdersByUser, getOrdersByReservation, getAllOrders, updateOrderStatus, cancelOrder };
