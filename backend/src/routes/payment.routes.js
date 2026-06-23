// ─── Payment Routes ─────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken } = require('../middleware/auth');
const { validateRequired } = require('../middleware/validate');

// Public
router.get('/key', paymentController.getKey);

// Webhook (must be before authenticateToken middleware — Razorpay calls this)
router.post('/webhook', paymentController.handleWebhook);

// Protected
router.post('/create-order', authenticateToken, validateRequired('bookingId'), paymentController.createOrder);
router.post('/verify', authenticateToken, validateRequired('razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'bookingId'), paymentController.verifyPayment);
router.post('/refund/:bookingId', authenticateToken, paymentController.initiateRefund);
router.get('/history', authenticateToken, paymentController.getPaymentHistory);

module.exports = router;
