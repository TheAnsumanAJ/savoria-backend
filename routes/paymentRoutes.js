const express = require('express');
const router = express.Router();
const { 
  createRazorpayOrder, 
  verifyPayment, 
  markAsCashPaid,
  confirmCashPayment,
  createRazorpayReservationOrder,
  verifyReservationPayment,
  markReservationAsCashPaid,
  confirmReservationCashPayment
} = require('../controllers/paymentController');

// Create Razorpay Order
router.post('/razorpay/order', createRazorpayOrder);

// Verify Razorpay Payment
router.post('/razorpay/verify', verifyPayment);

// Mark as Cash Paid (Intent)
router.post('/cash/paid', markAsCashPaid);

// Confirm Cash Paid (Manager Only)
router.post('/cash/confirm', confirmCashPayment);

// --- Reservation Level ---
router.post('/razorpay/reservation/order', createRazorpayReservationOrder);
router.post('/razorpay/reservation/verify', verifyReservationPayment);
router.post('/cash/reservation/paid', markReservationAsCashPaid);
router.post('/cash/reservation/confirm', confirmReservationCashPayment);

module.exports = router;
