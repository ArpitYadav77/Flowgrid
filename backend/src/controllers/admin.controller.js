// ─── Admin Controller — Admin Panel APIs ────────────────────────────

const prisma = require('../config/database');

// GET /api/admin/users — List all users
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;

    const where = {};
    if (role) where.role = role.toUpperCase();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
          provider: { select: { id: true, businessName: true, category: true, rating: true } },
          _count: { select: { bookings: true, reviews: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
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

// GET /api/admin/providers — List all providers
const getProviders = async (req, res, next) => {
  try {
    const { category, isVerified, page = 1, limit = 20 } = req.query;

    const where = {};
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (isVerified !== undefined) where.isVerified = isVerified === 'true';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [providers, total] = await Promise.all([
      prisma.provider.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { services: true, bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.provider.count({ where }),
    ]);

    res.json({
      data: providers,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/bookings — List all bookings
const getBookings = async (req, res, next) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: true,
          customer: { select: { id: true, name: true, email: true } },
          provider: { include: { user: { select: { name: true } } } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({
      data: bookings,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics — Revenue analytics
const getAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      totalRevenue,
      periodRevenue,
      totalBookings,
      periodBookings,
      totalUsers,
      totalProviders,
      bookingsByStatus,
      recentPayments,
      topServices,
    ] = await Promise.all([
      // Total revenue (all time)
      prisma.payment.aggregate({
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
      }),
      // Period revenue
      prisma.payment.aggregate({
        where: {
          status: 'CAPTURED',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Total bookings
      prisma.booking.count(),
      // Period bookings
      prisma.booking.count({
        where: { createdAt: { gte: startDate } },
      }),
      // Total users
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      // Total providers
      prisma.provider.count(),
      // Bookings by status
      prisma.booking.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Recent payments
      prisma.payment.findMany({
        where: { status: 'CAPTURED' },
        include: {
          booking: {
            include: {
              service: { select: { name: true } },
              customer: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Top services by booking count
      prisma.service.findMany({
        include: {
          _count: { select: { bookings: true } },
          provider: { include: { user: { select: { name: true } } } },
        },
        orderBy: { bookings: { _count: 'desc' } },
        take: 5,
      }),
    ]);

    res.json({
      revenue: {
        allTime: totalRevenue._sum.amount || 0,
        period: periodRevenue._sum.amount || 0,
        periodTransactions: periodRevenue._count || 0,
      },
      bookings: {
        allTime: totalBookings,
        period: periodBookings,
        byStatus: bookingsByStatus.reduce((acc, b) => {
          acc[b.status.toLowerCase()] = b._count;
          return acc;
        }, {}),
      },
      users: {
        customers: totalUsers,
        providers: totalProviders,
      },
      recentPayments,
      topServices,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/providers/:id/verify — Verify a provider
const verifyProvider = async (req, res, next) => {
  try {
    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data: { isVerified: true },
    });

    res.json({ success: true, provider });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getProviders,
  getBookings,
  getAnalytics,
  verifyProvider,
};
