// ─── Service Controller ─────────────────────────────────────────────

const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// GET /api/services — List all services (public)
const getServices = async (req, res, next) => {
  try {
    const { category, status = 'ACTIVE', providerId, page = 1, limit = 20, search } = req.query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (providerId) where.providerId = providerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          provider: {
            include: {
              user: { select: { name: true } },
            },
          },
          _count: { select: { bookings: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.service.count({ where }),
    ]);

    res.json({
      data: services,
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

// GET /api/services/:id — Get single service
const getService = async (req, res, next) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        provider: {
          include: {
            user: { select: { name: true, avatar: true } },
          },
        },
        reviews: {
          include: {
            user: { select: { name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    if (!service) throw new AppError('Service not found', 404);
    res.json(service);
  } catch (error) {
    next(error);
  }
};

// POST /api/services — Create service (provider only)
const createService = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const { name, description, category, duration, price, capacity, imageUrl } = req.body;

    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        name,
        description,
        category: category || provider.category,
        duration: parseInt(duration),
        price: parseFloat(price),
        capacity: capacity ? parseInt(capacity) : 1,
        imageUrl,
      },
      include: {
        provider: { include: { user: { select: { name: true } } } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Service created',
      service,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/services/:id — Update service (provider only)
const updateService = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (!provider) throw new AppError('Provider profile not found', 404);

    // Ensure the service belongs to this provider
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Service not found', 404);
    if (existing.providerId !== provider.id) throw new AppError('Not authorized', 403);

    const { name, description, category, duration, price, status, capacity, imageUrl } = req.body;

    const data = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (category) data.category = category;
    if (duration) data.duration = parseInt(duration);
    if (price) data.price = parseFloat(price);
    if (status) data.status = status.toUpperCase();
    if (capacity) data.capacity = parseInt(capacity);
    if (imageUrl !== undefined) data.imageUrl = imageUrl;

    const service = await prisma.service.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, service });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/services/:id — Delete service (provider only)
const deleteService = async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.user.id } });
    if (!provider) throw new AppError('Provider profile not found', 404);

    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Service not found', 404);
    if (existing.providerId !== provider.id) throw new AppError('Not authorized', 403);

    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
};
