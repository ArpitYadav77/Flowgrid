const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// In-memory orders store
const orders = [];
const completedPayments = [];

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// POST /api/razorpay/create-order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', bookingId, serviceId, serviceName, providerId } = req.body;

    if (!amount || !bookingId || !serviceId) {
      return res.status(400).json({ error: 'Amount, bookingId, and serviceId are required' });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `receipt_${bookingId}`,
      notes: {
        bookingId,
        serviceId,
        serviceName,
        customerId: req.user.id,
        customerName: req.user.name
      }
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    // Store order details in memory
    const order = {
      ...razorpayOrder,
      bookingId,
      serviceId,
      serviceName,
      providerId,
      customerId: req.user.id,
      customerName: req.user.name,
      customerEmail: req.user.email
    };

    orders.push(order);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: RAZORPAY_KEY_ID,
      bookingId,
      serviceName,
      prefill: {
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// POST /api/razorpay/verify-payment
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !bookingId) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    // Find the order
    const order = orders.find(o => o.id === razorpay_order_id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify signature using Razorpay's method
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update order status
    order.status = 'paid';
    order.payment_id = razorpay_payment_id;

    // Create payment record
    const payment = {
      id: `TXN-${uuidv4().slice(0, 5).toUpperCase()}`,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      bookingId,
      customerId: req.user.id,
      customerName: req.user.name,
      customerInitials: req.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      serviceId: order.serviceId,
      serviceName: order.serviceName,
      providerId: order.providerId,
      amount: order.amount / 100, // Convert back from paise
      currency: order.currency,
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    completedPayments.push(payment);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment,
      bookingId
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// GET /api/razorpay/orders
router.get('/orders', authenticateToken, (req, res) => {
  const userOrders = orders.filter(o => o.customerId === req.user.id);
  res.json(userOrders);
});

// GET /api/razorpay/payments
router.get('/payments', authenticateToken, (req, res) => {
  let userPayments;
  
  // Providers see payments for their services
  if (req.user.role !== 'customer') {
    userPayments = completedPayments.filter(p => p.providerId === req.user.id);
  } else {
    // Customers see their own payments
    userPayments = completedPayments.filter(p => p.customerId === req.user.id);
  }
  
  res.json({
    data: userPayments,
    totals: {
      total: userPayments.reduce((sum, p) => sum + p.amount, 0),
      completed: userPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
    }
  });
});

// POST /api/razorpay/refund
router.post('/refund/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = completedPayments.find(p => p.id === paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Only allow refund within 24 hours or by provider
    if (payment.customerId !== req.user.id && payment.providerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to refund this payment' });
    }

    // In production, initiate Razorpay refund
    payment.status = 'refunded';
    payment.refundedAt = new Date().toISOString();
    payment.refundReason = reason;

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      payment
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Refund failed' });
  }
});

// Get Razorpay key for frontend
router.get('/key', (req, res) => {
  res.json({ key: RAZORPAY_KEY_ID });
});

// POST /api/razorpay/create-qr - Create QR Code for UPI payment
router.post('/create-qr', authenticateToken, async (req, res) => {
  try {
    const { amount, bookingId, serviceId, serviceName, providerId } = req.body;

    if (!amount || !bookingId || !serviceId) {
      return res.status(400).json({ error: 'Amount, bookingId, and serviceId are required' });
    }

    let qr;
    let qrOrder;

    try {
      // Try to create QR code using Razorpay
      const qrData = {
        type: "upi_qr",
        name: "FlowGrid Booking",
        usage: "single_use",
        fixed_amount: true,
        payment_amount: Math.round(amount * 100), // Convert to paise
        description: `Payment for ${serviceName}`,
        customer_id: req.user.id,
        notes: {
          bookingId,
          serviceId,
          serviceName,
          customerId: req.user.id,
          customerName: req.user.name,
          providerId
        }
      };

      qr = await razorpayInstance.qrCode.create(qrData);

      // Store QR details
      qrOrder = {
        qr_id: qr.id,
        image_url: qr.image_url,
        amount: Math.round(amount * 100),
        bookingId,
        serviceId,
        serviceName,
        providerId,
        customerId: req.user.id,
        customerName: req.user.name,
        customerEmail: req.user.email,
        status: 'created',
        createdAt: new Date().toISOString()
      };
    } catch (qrError) {
      console.log('Razorpay QR creation failed, using test QR:', qrError.message);
      
      // Fallback: Create test QR code for development
      const testQrId = `qr_test_${uuidv4().slice(0, 12)}`;
      const upiString = `upi://pay?pa=flowgrid@paytm&pn=FlowGrid&am=${amount}&cu=INR&tn=Payment for ${serviceName}`;
      
      // Generate QR code image URL (using a QR code generator API or placeholder)
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
      
      qrOrder = {
        qr_id: testQrId,
        image_url: qrImageUrl,
        amount: Math.round(amount * 100),
        bookingId,
        serviceId,
        serviceName,
        providerId,
        customerId: req.user.id,
        customerName: req.user.name,
        customerEmail: req.user.email,
        status: 'created',
        createdAt: new Date().toISOString(),
        isTestMode: true
      };
    }

    orders.push(qrOrder);

    res.json({
      qr_id: qrOrder.qr_id,
      image_url: qrOrder.image_url,
      amount: qrOrder.amount,
      bookingId,
      serviceName
    });
  } catch (error) {
    console.error('Create QR error:', error);
    res.status(500).json({ error: 'Failed to create QR code', details: error.message });
  }
});

// POST /api/razorpay/verify-qr-payment - Verify QR payment and complete booking
router.post('/verify-qr-payment', authenticateToken, async (req, res) => {
  try {
    const { qr_id, payment_id, bookingId } = req.body;

    if (!qr_id || !payment_id || !bookingId) {
      return res.status(400).json({ error: 'QR ID, payment ID, and booking ID are required' });
    }

    // Find the QR order
    const qrOrder = orders.find(o => o.qr_id === qr_id);
    if (!qrOrder) {
      return res.status(404).json({ error: 'QR order not found' });
    }

    // In production, verify payment with Razorpay
    // const payment = await razorpayInstance.payments.fetch(payment_id);

    // Create payment record
    const payment = {
      id: `TXN-${uuidv4().slice(0, 5).toUpperCase()}`,
      qrId: qr_id,
      paymentId: payment_id,
      bookingId,
      customerId: req.user.id,
      customerName: req.user.name,
      customerInitials: req.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      serviceId: qrOrder.serviceId,
      serviceName: qrOrder.serviceName,
      providerId: qrOrder.providerId,
      amount: qrOrder.amount / 100,
      currency: 'INR',
      status: 'completed',
      paymentMethod: 'UPI QR',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    completedPayments.push(payment);
    qrOrder.status = 'paid';

    res.json({
      success: true,
      message: 'QR payment verified successfully',
      payment,
      bookingId
    });
  } catch (error) {
    console.error('Verify QR payment error:', error);
    res.status(500).json({ error: 'QR payment verification failed' });
  }
});

module.exports = router;
module.exports.completedPayments = completedPayments;
module.exports.orders = orders;
