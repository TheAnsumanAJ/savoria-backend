const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getOrdersByUser, 
  getOrdersByReservation,
  getAllOrders, 
  updateOrderStatus, 
  cancelOrder,
  getOrderById
} = require('../controllers/orderController');

// POST a new order
router.post('/', createOrder);

// GET all orders for a specific user email
router.get('/user/:email', getOrdersByUser);

// GET all orders (Manager only)
router.get('/', getAllOrders);

// GET all orders for a specific reservation
router.get('/reservation/:id', getOrdersByReservation);

// GET order by ID
router.get('/:id', getOrderById);

// PATCH to update order status (Manager only)
router.patch('/:id/status', updateOrderStatus);

// DELETE order (Cancel)
router.delete('/:id', cancelOrder);

module.exports = router;
