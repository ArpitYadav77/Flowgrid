// ─── Search Controller — Location-Based Service Discovery ───────────

const prisma = require('../config/database');

/**
 * Haversine distance between two geo-points in kilometers.
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// GET /api/search/nearby?lat=xx&lng=xx&radius=xx — Location-based search
const searchNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, category, page = 1, limit = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Use a bounding box first for rough filtering (much faster than full haversine on all rows)
    const latDelta = radiusKm / 111.32; // ~111km per degree latitude
    const lngDelta = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180));

    const where = {
      latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
      longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
    };

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const providers = await prisma.provider.findMany({
      where,
      include: {
        user: { select: { name: true, avatar: true } },
        services: {
          where: { status: 'ACTIVE' },
          take: 5,
        },
      },
    });

    // Calculate exact distances and filter by radius
    const results = providers
      .map((provider) => ({
        ...provider,
        distance: haversineDistance(latitude, longitude, provider.latitude, provider.longitude),
      }))
      .filter((p) => p.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Paginate
    const total = results.length;
    const paginated = results.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      data: paginated.map((p) => ({
        id: p.id,
        businessName: p.businessName,
        category: p.category,
        address: p.address,
        city: p.city,
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        totalReviews: p.totalReviews,
        distance: Math.round(p.distance * 100) / 100, // 2 decimal places
        user: p.user,
        services: p.services,
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      query: { lat: latitude, lng: longitude, radius: radiusKm },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/search/services — Full-text search on services
const searchServices = async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, minRating, page = 1, limit = 20 } = req.query;

    const where = { status: 'ACTIVE' };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { provider: { businessName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) };

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          provider: {
            include: { user: { select: { name: true, avatar: true } } },
          },
          _count: { select: { reviews: true, bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.service.count({ where }),
    ]);

    // Optionally filter by min rating (post-query since rating is on provider)
    let filtered = services;
    if (minRating) {
      filtered = services.filter(
        (s) => s.provider.rating >= parseFloat(minRating)
      );
    }

    res.json({
      data: filtered,
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

module.exports = { searchNearby, searchServices };
