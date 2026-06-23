// ─── Booking Controller ─────────────────────────────────────────────

const bookingService = require('../services/booking.service');
const notificationService = require('../services/notification.service');
const { AppError } = require('../middleware/errorHandler');

// POST /api/bookings — Create a new booking
const createBooking = async (req, res, next) => {
  try {
    const { providerId, serviceId, timeSlotId, date, startTime, notes } = req.body;

    const booking = await bookingService.createBooking({
      customerId: req.user.id,
      providerId,
      serviceId,
      timeSlotId,
      date,
      startTime,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Booking created. Please complete payment within 5 minutes.',
      booking,
      paymentRequired: true,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings — List user's bookings
const getBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getUserBookings(req.user.id, req.user.role, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings/:id — Get a single booking
const getBooking = async (req, res, next) => {
  try {
    const prisma = require('../config/database');
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        service: true,
        provider: { include: { user: { select: { name: true, email: true } } } },
        customer: { select: { id: true, name: true, email: true } },
        payment: true,
        review: true,
        timeSlot: true,
      },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    // Authorization: only customer, provider, or admin
    if (
      booking.customerId !== req.user.id &&
      booking.provider.userId !== req.user.id &&
      req.user.role !== 'ADMIN'
    ) {
      throw new AppError('Not authorized', 403);
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings/:id/cancel — Cancel a booking
const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await bookingService.cancelBooking(req.params.id, req.user.id, reason);

    // Send cancellation email
    try {
      await notificationService.sendBookingCancellation(
        result.booking.customer.email,
        result.booking,
        reason
      );
    } catch {
      // Non-blocking
    }

    res.json({
      success: true,
      message: 'Booking cancelled',
      booking: result.booking,
      refundEligible: result.refundEligible,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/bookings/:id/complete — Mark booking as completed (provider only)
const completeBooking = async (req, res, next) => {
  try {
    // Get the provider ID for this user
    const prisma = require('../config/database');
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const booking = await bookingService.completeBooking(req.params.id, provider.id);
    res.json({
      success: true,
      message: 'Booking marked as completed',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBooking,
  cancelBooking,
  completeBooking,
};
