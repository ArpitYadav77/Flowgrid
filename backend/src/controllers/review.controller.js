// ─── Review Controller ──────────────────────────────────────────────

const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// POST /api/reviews — Add review (only after COMPLETED booking)
const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      throw new AppError('bookingId and rating are required', 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    // Verify the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: true },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.customerId !== req.user.id) throw new AppError('Not authorized', 403);
    if (booking.status !== 'COMPLETED') {
      throw new AppError('You can only review completed bookings', 400);
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { bookingId },
    });
    if (existingReview) {
      throw new AppError('You have already reviewed this booking', 409);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        userId: req.user.id,
        serviceId: booking.serviceId,
        rating: parseInt(rating),
        comment,
      },
      include: {
        user: { select: { name: true, avatar: true } },
        service: { select: { name: true } },
      },
    });

    // Update provider's average rating
    const avgRating = await prisma.review.aggregate({
      where: { service: { providerId: booking.providerId } },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.provider.update({
      where: { id: booking.providerId },
      data: {
        rating: avgRating._avg.rating || 0,
        totalReviews: avgRating._count,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted',
      review,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/service/:serviceId — Get reviews for a service
const getServiceReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { serviceId: req.params.serviceId },
        include: {
          user: { select: { name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.review.count({ where: { serviceId: req.params.serviceId } }),
    ]);

    const avgRating = await prisma.review.aggregate({
      where: { serviceId: req.params.serviceId },
      _avg: { rating: true },
    });

    res.json({
      data: reviews,
      averageRating: avgRating._avg.rating || 0,
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

// GET /api/reviews/my — Get user's reviews
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      include: {
        service: { select: { name: true } },
        booking: { select: { date: true, startTime: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: reviews });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getServiceReviews,
  getMyReviews,
};
