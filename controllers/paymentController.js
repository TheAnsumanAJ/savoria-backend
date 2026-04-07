const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order
const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const options = {
      amount: Math.round(order.total * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${order._id.toString().slice(-6)}`,
    };

    const rzpOrder = await razorpay.orders.create(options);
    
    // Update order with Razorpay Order ID
    order.razorpayOrderId = rzpOrder.id;
    order.paymentMethod = 'Online';
    await order.save();

    res.json({
      id: rzpOrder.id,
      currency: rzpOrder.currency,
      amount: rzpOrder.amount
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
};

// Verify Razorpay Payment Signature
const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findById(orderId);
      order.paymentStatus = 'Paid';
      order.razorpayPaymentId = razorpay_payment_id;
      await order.save();

      // Notify via socket
      const io = req.app.get('io');
      if (io) {
        const payload = { orderId: order._id, status: order.status, paymentStatus: 'Paid' };
        io.to('managers').emit('order-status-update', payload);
        io.to(order.userEmail).emit('order-status-update', payload);
      }

      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User selects Cash Payment (Intent)
const markAsCashPaid = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.paymentMethod = 'Cash';
    order.paymentStatus = 'Pending'; // Remains pending until manager confirms
    await order.save();

    res.json({ success: true, message: 'Cash payment initiated. Please pay at the counter.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to initiate cash payment' });
  }
};

// Manager confirms Cash Payment received
const confirmCashPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.paymentStatus = 'Paid';
    await order.save();

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      const payload = { orderId: order._id, paymentStatus: 'Paid' };
      io.to('managers').emit('order-status-update', payload);
      io.to(order.userEmail).emit('order-status-update', payload);
    }

    res.json({ success: true, message: 'Order marked as paid' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to confirm payment' });
  }
};

// Create Razorpay Order for a Reservation (Cumulative Total)
const createRazorpayReservationOrder = async (req, res) => {
  try {
    const { reservationId } = req.body;
    const unpaidOrders = await Order.find({ reservationId, paymentStatus: 'Pending', status: { $ne: 'Cancelled' } });

    if (unpaidOrders.length === 0) {
      return res.status(404).json({ message: 'No unpaid orders found for this reservation' });
    }

    const totalAmount = unpaidOrders.reduce((sum, order) => sum + order.total, 0);

    const options = {
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `receipt_res_${reservationId.toString().slice(-6)}`,
    };

    const rzpOrder = await razorpay.orders.create(options);
    
    // Save the Razorpay Order ID to all unpaid orders for consistency
    await Order.updateMany(
      { reservationId, paymentStatus: 'Pending', status: { $ne: 'Cancelled' } },
      { razorpayOrderId: rzpOrder.id, paymentMethod: 'Online' }
    );

    res.json({
      id: rzpOrder.id,
      currency: rzpOrder.currency,
      amount: rzpOrder.amount
    });
  } catch (err) {
    console.error('Razorpay Reservation Order Error:', err);
    res.status(500).json({ message: 'Failed to create Razorpay reservation order' });
  }
};

// Verify Razorpay Payment for a Reservation
const verifyReservationPayment = async (req, res) => {
  try {
    const { reservationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Mark all pending orders for this reservation as paid
      await Order.updateMany(
        { reservationId, paymentStatus: 'Pending', status: { $ne: 'Cancelled' } },
        { 
          paymentStatus: 'Paid', 
          paymentMethod: 'Online',
          razorpayPaymentId: razorpay_payment_id 
        }
      );

      // Notify via socket
      const io = req.app.get('io');
      if (io) {
        const payload = { reservationId, paymentStatus: 'Paid' };
        io.to('managers').emit('order-status-update', payload);
        
        // Get user email from the first order to notify them
        const representativeOrder = await Order.findOne({ reservationId });
        if (representativeOrder) {
          io.to(representativeOrder.userEmail).emit('order-status-update', payload);
        }
      }

      res.json({ success: true, message: "Reservation payment verified successfully" });
    } else {
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error('Reservation Payment Verification Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// User selects Cash for all orders in reservation (Intent)
const markReservationAsCashPaid = async (req, res) => {
  try {
    const { reservationId } = req.body;
    await Order.updateMany(
      { reservationId, paymentStatus: 'Pending', status: { $ne: 'Cancelled' } },
      { 
        paymentMethod: 'Cash',
        paymentStatus: 'Pending' 
      }
    );

    res.json({ success: true, message: 'All orders for this reservation set to Cash. Please pay at the counter.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to initiate reservation cash payment' });
  }
};

// Manager confirms Cash Payment for all reservation orders
const confirmReservationCashPayment = async (req, res) => {
  try {
    const { reservationId } = req.body;
    await Order.updateMany(
      { reservationId, paymentMethod: 'Cash', paymentStatus: 'Pending', status: { $ne: 'Cancelled' } },
      { paymentStatus: 'Paid' }
    );

    // Notify via socket
    const io = req.app.get('io');
    if (io) {
      const payload = { reservationId, paymentStatus: 'Paid' };
      io.to('managers').emit('order-status-update', payload);
      
      const representativeOrder = await Order.findOne({ reservationId });
      if (representativeOrder) {
        io.to(representativeOrder.userEmail).emit('order-status-update', payload);
      }
    }

    res.json({ success: true, message: 'All reservation orders marked as paid' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to confirm reservation payment' });
  }
};

module.exports = { 
  createRazorpayOrder, 
  verifyPayment, 
  markAsCashPaid,
  confirmCashPayment,
  createRazorpayReservationOrder,
  verifyReservationPayment,
  markReservationAsCashPaid,
  confirmReservationCashPayment
};
