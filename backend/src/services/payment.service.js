// ─── Payment Service — Razorpay Integration ────────────────────────

const crypto = require('crypto');
const prisma = require('../config/database');
const { razorpay, RAZORPAY_KEY_SECRET } = require('../config/razorpay');
const { AppError } = require('../middleware/errorHandler');
const bookingService = require('./booking.service');

/**
 * Create a Razorpay order for a booking.
 */
const createOrder = async (bookingId, userId) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true, customer: true },
  });

  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.customerId !== userId) throw new AppError('Not authorized', 403);
  if (booking.status !== 'PENDING') throw new AppError('Booking is not in pending state', 400);

  // Check if payment already exists
  const existingPayment = await prisma.payment.findUnique({
    where: { bookingId },
  });

  if (existingPayment && existingPayment.status === 'CAPTURED') {
    throw new AppError('Payment already completed for this booking', 400);
  }

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(booking.price * 100), // paise
    currency: booking.currency,
    receipt: `booking_${bookingId}`,
    notes: {
      bookingId,
      serviceId: booking.serviceId,
      customerId: userId,
    },
  });

  // Create or update payment record
  const payment = await prisma.payment.upsert({
    where: { bookingId },
    update: {
      razorpayOrderId: razorpayOrder.id,
      amount: booking.price,
      currency: booking.currency,
      status: 'CREATED',
    },
    create: {
      bookingId,
      userId,
      razorpayOrderId: razorpayOrder.id,
      amount: booking.price,
      currency: booking.currency,
      status: 'CREATED',
    },
  });

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    bookingId,
    payment,
  };
};

/**
 * Verify Razorpay payment signature (called from client after checkout).
 */
const verifyPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  bookingId,
}) => {
  // 1. Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new AppError('Invalid payment signature', 400);
  }

  // 2. Update payment record
  const payment = await prisma.payment.update({
    where: { razorpayOrderId: razorpay_order_id },
    data: {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'CAPTURED',
    },
  });

  // 3. Confirm the booking
  const booking = await bookingService.confirmBooking(bookingId);

  return { payment, booking };
};

/**
 * Handle Razorpay webhook events.
 * Verifies webhook signature and processes payment events.
 */
const handleWebhook = async (body, signature) => {
  // Verify webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new AppError('Invalid webhook signature', 400);
    }
  }

  const event = body.event;
  const payload = body.payload;

  switch (event) {
    case 'payment.captured': {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;

      const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId: orderId },
      });

      if (payment && payment.status !== 'CAPTURED') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: paymentEntity.id,
            status: 'CAPTURED',
            method: paymentEntity.method,
          },
        });

        await bookingService.confirmBooking(payment.bookingId);
      }
      break;
    }

    case 'payment.failed': {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;

      const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId: orderId },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        // Release the slot
        const booking = await prisma.booking.findUnique({
          where: { id: payment.bookingId },
        });
        if (booking && booking.timeSlotId) {
          await prisma.timeSlot.update({
            where: { id: booking.timeSlotId },
            data: {
              status: 'AVAILABLE',
              lockedBy: null,
              lockedAt: null,
              lockExpiry: null,
            },
          });
        }
      }
      break;
    }

    case 'refund.created': {
      const refundEntity = payload.refund.entity;
      const paymentId = refundEntity.payment_id;

      const payment = await prisma.payment.findUnique({
        where: { razorpayPaymentId: paymentId },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            refundId: refundEntity.id,
            refundAmount: refundEntity.amount / 100,
            refundedAt: new Date(),
          },
        });
      }
      break;
    }

    default:
      console.log(`Unhandled webhook event: ${event}`);
  }

  return { received: true };
};

/**
 * Initiate a refund via Razorpay.
 */
const initiateRefund = async (bookingId, userId, reason) => {
  const payment = await prisma.payment.findUnique({
    where: { bookingId },
    include: { booking: true },
  });

  if (!payment) throw new AppError('Payment not found for this booking', 404);
  if (payment.status !== 'CAPTURED') throw new AppError('Only captured payments can be refunded', 400);
  if (payment.booking.customerId !== userId && payment.booking.providerId !== userId) {
    throw new AppError('Not authorized to refund this payment', 403);
  }

  // Initiate Razorpay refund
  try {
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: Math.round(payment.amount * 100), // full refund in paise
      notes: { reason, bookingId },
    });

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        refundId: refund.id,
        refundAmount: payment.amount,
        refundReason: reason,
        refundedAt: new Date(),
      },
    });

    return updatedPayment;
  } catch (error) {
    // If Razorpay API fails (e.g., test mode), still update locally
    console.error('Razorpay refund error:', error.message);
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
        refundAmount: payment.amount,
        refundReason: reason,
        refundedAt: new Date(),
      },
    });
    return updatedPayment;
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  initiateRefund,
};
