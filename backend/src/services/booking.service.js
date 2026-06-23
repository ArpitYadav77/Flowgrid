// ─── Booking Service — Core Transactional Logic ─────────────────────

const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const slotService = require('./slot.service');
const { getIO } = require('../config/socket');

/**
 * Create a booking with slot locking.
 * Flow: Lock slot → Create booking → Payment → Confirm
 */
const createBooking = async ({ customerId, providerId, serviceId, timeSlotId, date, startTime, notes }) => {
  return prisma.$transaction(async (tx) => {
    // 1. Verify the service exists and is active
    const service = await tx.service.findUnique({
      where: { id: serviceId },
      include: { provider: true },
    });

    if (!service) throw new AppError('Service not found', 404);
    if (service.status !== 'ACTIVE') throw new AppError('Service is not currently available', 400);
    if (service.providerId !== providerId) throw new AppError('Service does not belong to this provider', 400);

    // 2. Verify the time slot
    const slot = await tx.timeSlot.findUnique({ where: { id: timeSlotId } });
    if (!slot) throw new AppError('Time slot not found', 404);

    // Check slot availability (allow if locked by this user)
    if (slot.status === 'BOOKED') {
      throw new AppError('This slot is already booked', 409);
    }
    if (slot.status === 'LOCKED' && slot.lockedBy !== customerId) {
      if (slot.lockExpiry && slot.lockExpiry > new Date()) {
        throw new AppError('Slot is being held by another user', 409);
      }
    }

    // 3. Lock the slot
    await tx.timeSlot.update({
      where: { id: timeSlotId },
      data: {
        status: 'LOCKED',
        lockedBy: customerId,
        lockedAt: new Date(),
        lockExpiry: new Date(Date.now() + slotService.LOCK_DURATION_MS),
      },
    });

    // 4. Calculate end time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const totalMinutes = startHour * 60 + startMin + service.duration;
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    // 5. Create the booking
    const booking = await tx.booking.create({
      data: {
        customerId,
        providerId,
        serviceId,
        timeSlotId,
        date: new Date(date),
        startTime,
        endTime,
        duration: service.duration,
        price: service.price,
        currency: service.currency,
        status: 'PENDING',
        notes,
      },
      include: {
        service: true,
        provider: { include: { user: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    return booking;
  }, {
    isolationLevel: 'Serializable',
    timeout: 15000,
  });
};

/**
 * Confirm a booking after successful payment.
 */
const confirmBooking = async (bookingId) => {
  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
    include: {
      service: true,
      provider: true,
      customer: { select: { id: true, name: true, email: true } },
      timeSlot: true,
    },
  });

  // Mark the time slot as booked
  if (booking.timeSlotId) {
    await slotService.confirmSlot(booking.timeSlotId);
  }

  // Emit real-time update
  try {
    const io = getIO();
    // Notify the provider
    io.to(`provider:${booking.providerId}`).emit('booking:new', {
      bookingId: booking.id,
      customerName: booking.customer.name,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.startTime,
    });

    // Notify all users watching this service's slots
    io.to(`service:${booking.serviceId}`).emit('slot:booked', {
      timeSlotId: booking.timeSlotId,
      date: booking.date,
      startTime: booking.startTime,
    });
  } catch {
    // Socket not initialized (e.g., in tests) — ignore
  }

  return booking;
};

/**
 * Cancel a booking.
 */
const cancelBooking = async (bookingId, userId, reason) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) throw new AppError('Booking not found', 404);

  // Only the customer, provider, or admin can cancel
  if (booking.customerId !== userId && booking.providerId !== userId) {
    throw new AppError('Not authorized to cancel this booking', 403);
  }

  if (booking.status === 'CANCELLED') {
    throw new AppError('Booking is already cancelled', 400);
  }

  if (booking.status === 'COMPLETED') {
    throw new AppError('Cannot cancel a completed booking', 400);
  }

  const wasConfirmed = booking.status === 'CONFIRMED';

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason,
    },
    include: {
      service: true,
      provider: true,
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  // Release the time slot
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

    // Emit real-time slot freed event
    try {
      const io = getIO();
      io.to(`service:${booking.serviceId}`).emit('slot:freed', {
        timeSlotId: booking.timeSlotId,
        date: booking.date,
        startTime: booking.startTime,
      });
    } catch {
      // Ignore
    }
  }

  return { booking: updatedBooking, refundEligible: wasConfirmed };
};

/**
 * Complete a booking (provider marks it as done).
 */
const completeBooking = async (bookingId, providerId) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.providerId !== providerId) throw new AppError('Not authorized', 403);
  if (booking.status !== 'CONFIRMED') throw new AppError('Only confirmed bookings can be completed', 400);

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
    include: {
      service: true,
      customer: { select: { id: true, name: true, email: true } },
    },
  });
};

/**
 * Get bookings for a user (customer or provider).
 */
const getUserBookings = async (userId, role, filters = {}) => {
  const where = {};

  if (role === 'CUSTOMER') {
    where.customerId = userId;
  } else if (role === 'PROVIDER') {
    // Find the provider record
    const provider = await prisma.provider.findUnique({ where: { userId } });
    if (provider) {
      where.providerId = provider.id;
    }
  }

  if (filters.status) where.status = filters.status;
  if (filters.date) where.date = new Date(filters.date);
  if (filters.startDate) where.date = { ...where.date, gte: new Date(filters.startDate) };
  if (filters.endDate) where.date = { ...where.date, lte: new Date(filters.endDate) };

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        service: true,
        provider: { include: { user: { select: { name: true } } } },
        customer: { select: { id: true, name: true, email: true } },
        payment: true,
        review: true,
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    data: bookings,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  createBooking,
  confirmBooking,
  cancelBooking,
  completeBooking,
  getUserBookings,
};
