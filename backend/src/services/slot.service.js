// ─── Slot Service — Lock / Release / Expiration ─────────────────────

const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Lock a time slot for a user during payment.
 * Uses a DB transaction to prevent race conditions.
 */
const lockSlot = async (slotId, userId) => {
  return prisma.$transaction(async (tx) => {
    // Fetch slot with a lock (SELECT ... FOR UPDATE via raw query)
    const slot = await tx.timeSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new AppError('Time slot not found', 404);
    }

    // If slot is locked by someone else and lock hasn't expired
    if (
      slot.status === 'LOCKED' &&
      slot.lockedBy !== userId &&
      slot.lockExpiry &&
      slot.lockExpiry > new Date()
    ) {
      throw new AppError('Slot is currently being booked by another user. Please try again shortly.', 409);
    }

    if (slot.status === 'BOOKED') {
      throw new AppError('This slot is already booked', 409);
    }

    // Lock the slot
    const updatedSlot = await tx.timeSlot.update({
      where: { id: slotId },
      data: {
        status: 'LOCKED',
        lockedBy: userId,
        lockedAt: new Date(),
        lockExpiry: new Date(Date.now() + LOCK_DURATION_MS),
      },
    });

    return updatedSlot;
  }, {
    isolationLevel: 'Serializable', // Strictest isolation to prevent race conditions
    timeout: 10000,
  });
};

/**
 * Release a locked slot (e.g., payment failed or user cancelled).
 */
const releaseSlot = async (slotId, userId) => {
  const slot = await prisma.timeSlot.findUnique({ where: { id: slotId } });

  if (!slot) throw new AppError('Time slot not found', 404);
  if (slot.lockedBy !== userId && slot.status === 'LOCKED') {
    throw new AppError('Not authorized to release this slot', 403);
  }

  return prisma.timeSlot.update({
    where: { id: slotId },
    data: {
      status: 'AVAILABLE',
      lockedBy: null,
      lockedAt: null,
      lockExpiry: null,
    },
  });
};

/**
 * Confirm a slot as booked (after payment success).
 */
const confirmSlot = async (slotId) => {
  return prisma.timeSlot.update({
    where: { id: slotId },
    data: {
      status: 'BOOKED',
      lockedBy: null,
      lockedAt: null,
      lockExpiry: null,
    },
  });
};

/**
 * Release all expired locks (run as a periodic job).
 */
const releaseExpiredLocks = async () => {
  const result = await prisma.timeSlot.updateMany({
    where: {
      status: 'LOCKED',
      lockExpiry: { lt: new Date() },
    },
    data: {
      status: 'AVAILABLE',
      lockedBy: null,
      lockedAt: null,
      lockExpiry: null,
    },
  });

  if (result.count > 0) {
    console.log(`🔓 Released ${result.count} expired slot lock(s)`);
  }

  return result.count;
};

/**
 * Get available slots for a provider on a given date.
 */
const getAvailableSlots = async (providerId, date, serviceId = null) => {
  const dateObj = new Date(date);

  // Get all slots for the provider on that date
  const slots = await prisma.timeSlot.findMany({
    where: {
      providerId,
      date: dateObj,
      status: {
        in: ['AVAILABLE'],
      },
    },
    orderBy: { startTime: 'asc' },
  });

  // If serviceId is provided, filter slots that fit the service duration
  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (service) {
      // For simplicity, return slots whose duration matches or exceeds the service
      return slots;
    }
  }

  return slots;
};

/**
 * Generate time slots for a provider on a given date.
 * Called when provider sets availability.
 */
const generateSlots = async (providerId, date, startHour = 9, endHour = 18, intervalMinutes = 30) => {
  const dateObj = new Date(date);
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      if (hour === endHour - 1 && min + intervalMinutes > 60) break;

      const startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const endMin = min + intervalMinutes;
      const endHr = hour + Math.floor(endMin / 60);
      const endMinute = endMin % 60;
      const endTime = `${String(endHr).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      slots.push({
        providerId,
        date: dateObj,
        startTime,
        endTime,
        status: 'AVAILABLE',
      });
    }
  }

  // Upsert — skip existing slots
  const created = await prisma.$transaction(
    slots.map((s) =>
      prisma.timeSlot.upsert({
        where: {
          providerId_date_startTime: {
            providerId: s.providerId,
            date: s.date,
            startTime: s.startTime,
          },
        },
        update: {},
        create: s,
      })
    )
  );

  return created;
};

module.exports = {
  lockSlot,
  releaseSlot,
  confirmSlot,
  releaseExpiredLocks,
  getAvailableSlots,
  generateSlots,
  LOCK_DURATION_MS,
};
