// ─── Provider Controller ────────────────────────────────────────────

const prisma = require('../config/database');
const slotService = require('../services/slot.service');
const { AppError } = require('../middleware/errorHandler');

// GET /api/provider/dashboard — Provider dashboard stats
const getDashboard = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: req.user.id },
    });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalBookings,
      confirmedBookings,
      pendingBookings,
      todayBookings,
      completedBookings,
      totalRevenue,
      services,
      recentBookings,
    ] = await Promise.all([
      prisma.booking.count({ where: { providerId: provider.id } }),
      prisma.booking.count({ where: { providerId: provider.id, status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { providerId: provider.id, status: 'PENDING' } }),
      prisma.booking.count({ where: { providerId: provider.id, date: { gte: today } } }),
      prisma.booking.count({ where: { providerId: provider.id, status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        where: {
          booking: { providerId: provider.id },
          status: 'CAPTURED',
        },
        _sum: { amount: true },
      }),
      prisma.service.findMany({
        where: { providerId: provider.id },
        include: { _count: { select: { bookings: true, reviews: true } } },
      }),
      prisma.booking.findMany({
        where: { providerId: provider.id },
        include: {
          service: true,
          customer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      stats: {
        revenue: {
          value: totalRevenue._sum.amount || 0,
          label: 'Total Revenue',
        },
        bookings: {
          value: totalBookings,
          label: 'Total Bookings',
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
        },
        todayBookings: {
          value: todayBookings,
          label: "Today's Bookings",
        },
        rating: {
          value: provider.rating,
          label: 'Avg. Rating',
          totalReviews: provider.totalReviews,
        },
      },
      services,
      recentBookings,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/provider/schedule — Provider's schedule
const getSchedule = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: req.user.id },
    });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const { date, startDate, endDate } = req.query;

    const where = {
      providerId: provider.id,
      status: { in: ['CONFIRMED', 'PENDING'] },
    };

    if (date) where.date = new Date(date);
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ data: bookings, total: bookings.length });
  } catch (error) {
    next(error);
  }
};

// POST /api/provider/slots — Set availability (generate time slots)
const setAvailability = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: req.user.id },
    });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const { date, startHour = 9, endHour = 18, intervalMinutes = 30 } = req.body;
    if (!date) throw new AppError('Date is required', 400);

    const slots = await slotService.generateSlots(
      provider.id,
      date,
      parseInt(startHour),
      parseInt(endHour),
      parseInt(intervalMinutes)
    );

    res.status(201).json({
      success: true,
      message: `${slots.length} slots created for ${date}`,
      slots,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/provider/slots — Get provider's time slots for a date
const getSlots = async (req, res, next) => {
  try {
    const { providerId, date } = req.query;

    let pid = providerId;
    if (!pid) {
      const provider = await prisma.provider.findUnique({
        where: { userId: req.user.id },
      });
      if (!provider) throw new AppError('Provider profile not found', 404);
      pid = provider.id;
    }

    if (!date) throw new AppError('Date is required', 400);

    const slots = await slotService.getAvailableSlots(pid, date);

    res.json({
      date,
      providerId: pid,
      slots,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/provider/bookings/:id/accept — Accept a booking
const acceptBooking = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: req.user.id },
    });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.providerId !== provider.id) throw new AppError('Not authorized', 403);

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
      include: {
        service: true,
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, booking: updated });
  } catch (error) {
    next(error);
  }
};

// POST /api/provider/bookings/:id/reject — Reject a booking
const rejectBooking = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { userId: req.user.id },
    });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.providerId !== provider.id) throw new AppError('Not authorized', 403);

    const { reason } = req.body;

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Rejected by provider',
      },
      include: {
        service: true,
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    // Release the slot
    if (booking.timeSlotId) {
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

    res.json({ success: true, booking: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getSchedule,
  setAvailability,
  getSlots,
  acceptBooking,
  rejectBooking,
};
