// ─── Payment Controller ─────────────────────────────────────────────

const paymentService = require('../services/payment.service');
const notificationService = require('../services/notification.service');
const { RAZORPAY_KEY_ID } = require('../config/razorpay');

// POST /api/payments/create-order — Create Razorpay order
const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const result = await paymentService.createOrder(bookingId, req.user.id);

    res.json({
      ...result,
      key: RAZORPAY_KEY_ID,
      prefill: {
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/verify — Verify payment after checkout
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const result = await paymentService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    });

    // Send confirmation emails (non-blocking)
    try {
      await notificationService.sendBookingConfirmation(
        req.user.email,
        result.booking
      );
      if (result.booking.provider?.user?.email) {
        await notificationService.sendProviderNewBooking(
          result.booking.provider.user.email,
          result.booking,
          req.user.name
        );
      }
    } catch {
      // Non-blocking
    }

    res.json({
      success: true,
      message: 'Payment verified and booking confirmed',
      payment: result.payment,
      booking: result.booking,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/webhook — Razorpay webhook
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const result = await paymentService.handleWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/refund/:bookingId — Initiate refund
const initiateRefund = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await paymentService.initiateRefund(req.params.bookingId, req.user.id, reason);

    res.json({
      success: true,
      message: 'Refund initiated',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/key — Get Razorpay public key
const getKey = (req, res) => {
  res.json({ key: RAZORPAY_KEY_ID });
};

// GET /api/payments/history — Get user's payment history
const getPaymentHistory = async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const { status, page = 1, limit = 20 } = req.query;

    const where = { userId: req.user.id };
    if (status) where.status = status.toUpperCase();

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              service: true,
              provider: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.payment.count({ where }),
    ]);

    const totals = await prisma.payment.aggregate({
      where: { userId: req.user.id },
      _sum: { amount: true },
    });

    res.json({
      data: payments,
      totals: { total: totals._sum.amount || 0 },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  initiateRefund,
  getKey,
  getPaymentHistory,
};
