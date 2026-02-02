const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// In-memory time slots store
let timeSlots = [];
let providerServices = [];
let customerBookings = [];

// Initialize with sample data
const initializeSlots = () => {
  // Sample salon services
  providerServices = [
    {
      id: 'SRV-HAIRCUT-001',
      providerId: 'USR-SALON-01',
      providerName: 'Priya\'s Beauty Salon',
      name: 'Haircut',
      description: 'Professional haircut by experienced stylists',
      category: 'salon',
      duration: 30,
      price: 299,
      currency: 'INR',
      status: 'active',
      capacity: 1,
      bookings: 145,
      rating: 4.8,
      createdAt: '2025-03-15T00:00:00.000Z'
    },
    {
      id: 'SRV-BEARD-001',
      providerId: 'USR-SALON-01',
      providerName: 'Priya\'s Beauty Salon',
      name: 'Beard Trim',
      description: 'Precise beard trimming and styling',
      category: 'salon',
      duration: 20,
      price: 149,
      currency: 'INR',
      status: 'active',
      capacity: 1,
      bookings: 98,
      rating: 4.7,
      createdAt: '2025-03-15T00:00:00.000Z'
    },
    {
      id: 'SRV-FACIAL-001',
      providerId: 'USR-SALON-01',
      providerName: 'Priya\'s Beauty Salon',
      name: 'Facial Treatment',
      description: 'Relaxing facial with premium products',
      category: 'salon',
      duration: 45,
      price: 599,
      currency: 'INR',
      status: 'active',
      capacity: 1,
      bookings: 67,
      rating: 4.9,
      createdAt: '2025-04-01T00:00:00.000Z'
    },
    {
      id: 'SRV-MATH-001',
      providerId: 'USR-TUTOR-01',
      providerName: 'Amit\'s Math Academy',
      name: 'Math Tutoring (1 hr)',
      description: 'One-on-one math tutoring for classes 8-12',
      category: 'tutor',
      duration: 60,
      price: 500,
      currency: 'INR',
      status: 'active',
      capacity: 1,
      bookings: 156,
      rating: 4.9,
      createdAt: '2025-04-20T00:00:00.000Z'
    },
    {
      id: 'SRV-PHYSICS-001',
      providerId: 'USR-TUTOR-01',
      providerName: 'Amit\'s Math Academy',
      name: 'Physics Tutoring (1 hr)',
      description: 'Comprehensive physics lessons',
      category: 'tutor',
      duration: 60,
      price: 550,
      currency: 'INR',
      status: 'active',
      capacity: 1,
      bookings: 89,
      rating: 4.8,
      createdAt: '2025-05-01T00:00:00.000Z'
    }
  ];

  // Generate time slots for next 7 days
  const today = new Date();
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    // Generate slots from 9 AM to 6 PM for salon
    const salonSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30'
    ];

    salonSlots.forEach(time => {
      // Mark some slots as booked randomly for demo
      const isBooked = day < 2 && Math.random() < 0.3;
      
      timeSlots.push({
        id: `SLOT-${uuidv4().slice(0, 8)}`,
        providerId: 'USR-SALON-01',
        date: dateStr,
        time,
        duration: 30,
        status: isBooked ? 'booked' : 'available',
        capacity: 1,
        bookedBy: isBooked ? 'USR-CUSTOMER-01' : null,
        bookingId: isBooked ? `BKG-${uuidv4().slice(0, 6).toUpperCase()}` : null
      });
    });

    // Generate slots for tutor
    const tutorSlots = [
      '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
    ];

    tutorSlots.forEach(time => {
      const isBooked = day < 2 && Math.random() < 0.25;
      
      timeSlots.push({
        id: `SLOT-${uuidv4().slice(0, 8)}`,
        providerId: 'USR-TUTOR-01',
        date: dateStr,
        time,
        duration: 60,
        status: isBooked ? 'booked' : 'available',
        capacity: 1,
        bookedBy: isBooked ? 'USR-CUSTOMER-01' : null,
        bookingId: isBooked ? `BKG-${uuidv4().slice(0, 6).toUpperCase()}` : null
      });
    });
  }
};

initializeSlots();

// GET /api/slots/services - Get all available services
router.get('/services', (req, res) => {
  const { category, providerId, status = 'active' } = req.query;
  
  let filtered = providerServices.filter(s => s.status === status);
  
  if (category) {
    filtered = filtered.filter(s => s.category === category);
  }
  
  if (providerId) {
    filtered = filtered.filter(s => s.providerId === providerId);
  }

  res.json({
    data: filtered,
    total: filtered.length
  });
});

// GET /api/slots/services/:serviceId
router.get('/services/:serviceId', (req, res) => {
  const service = providerServices.find(s => s.id === req.params.serviceId);
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  res.json(service);
});

// GET /api/slots/available - Get available slots for a date
router.get('/available', (req, res) => {
  const { date, providerId, serviceId } = req.query;

  if (!date || !providerId) {
    return res.status(400).json({ error: 'Date and providerId are required' });
  }

  const service = serviceId ? providerServices.find(s => s.id === serviceId) : null;
  const slotDuration = service ? service.duration : 30;

  const availableSlots = timeSlots.filter(slot => 
    slot.date === date && 
    slot.providerId === providerId && 
    slot.status === 'available' &&
    slot.duration >= slotDuration
  );

  res.json({
    date,
    providerId,
    slots: availableSlots.map(slot => ({
      id: slot.id,
      time: slot.time,
      duration: slot.duration,
      available: true
    }))
  });
});

// POST /api/slots/book - Book a time slot (ATOMIC)
router.post('/book', authenticateToken, (req, res) => {
  const { slotId, serviceId, date, time, providerId } = req.body;

  if (!serviceId || !date || !time || !providerId) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  // Find the service
  const service = providerServices.find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  // Find the slot
  let slot = timeSlots.find(s => 
    s.date === date && 
    s.time === time && 
    s.providerId === providerId
  );

  // ATOMIC: Check if slot is available
  if (!slot) {
    return res.status(404).json({ error: 'Time slot not found' });
  }

  if (slot.status === 'booked') {
    return res.status(409).json({ 
      error: 'Slot already booked',
      message: 'This time slot has already been booked by another customer. Please select a different time.'
    });
  }

  // TRANSACTIONAL: Lock the slot immediately
  const bookingId = `BKG-${uuidv4().slice(0, 6).toUpperCase()}`;
  
  // Update slot atomically
  slot.status = 'booked';
  slot.bookedBy = req.user.id;
  slot.bookingId = bookingId;
  slot.lockedAt = new Date().toISOString();

  // Create booking record
  const booking = {
    id: bookingId,
    customerId: req.user.id,
    customerName: req.user.name,
    customerEmail: req.user.email,
    providerId,
    providerName: service.providerName,
    serviceId,
    serviceName: service.name,
    serviceCategory: service.category,
    date,
    time,
    duration: service.duration,
    price: service.price,
    currency: service.currency,
    status: 'pending', // Awaiting payment
    slotId: slot.id,
    createdAt: new Date().toISOString()
  };

  customerBookings.push(booking);

  // Update service booking count
  service.bookings++;

  res.status(201).json({
    success: true,
    message: 'Slot booked successfully. Please complete payment.',
    booking,
    paymentRequired: true
  });
});

// POST /api/slots/confirm - Confirm booking after payment
router.post('/confirm/:bookingId', authenticateToken, (req, res) => {
  const { bookingId } = req.params;
  const { paymentId } = req.body;

  const booking = customerBookings.find(b => b.id === bookingId);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.customerId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Update booking status
  booking.status = 'confirmed';
  booking.paymentId = paymentId;
  booking.confirmedAt = new Date().toISOString();

  // Update slot status
  const slot = timeSlots.find(s => s.id === booking.slotId);
  if (slot) {
    slot.status = 'confirmed';
  }

  res.json({
    success: true,
    message: 'Booking confirmed!',
    booking
  });
});

// POST /api/slots/cancel - Cancel a booking
router.post('/cancel/:bookingId', authenticateToken, (req, res) => {
  const { bookingId } = req.params;
  const { reason } = req.body;

  const bookingIndex = customerBookings.findIndex(b => b.id === bookingId);
  
  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const booking = customerBookings[bookingIndex];

  if (booking.customerId !== req.user.id && booking.providerId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Release the slot
  const slot = timeSlots.find(s => s.id === booking.slotId);
  if (slot) {
    slot.status = 'available';
    slot.bookedBy = null;
    slot.bookingId = null;
  }

  // Update booking
  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  booking.cancellationReason = reason;

  res.json({
    success: true,
    message: 'Booking cancelled',
    booking,
    refundEligible: booking.status === 'confirmed'
  });
});

// GET /api/slots/bookings - Get user's bookings
router.get('/bookings', authenticateToken, (req, res) => {
  const { status, date } = req.query;
  
  let userBookings;
  
  // Providers see bookings for their services
  if (req.user.role !== 'customer') {
    userBookings = customerBookings.filter(b => b.providerId === req.user.id);
  } else {
    // Customers see their own bookings
    userBookings = customerBookings.filter(b => b.customerId === req.user.id);
  }

  if (status) {
    userBookings = userBookings.filter(b => b.status === status);
  }

  if (date) {
    userBookings = userBookings.filter(b => b.date === date);
  }

  // Sort by date and time
  userBookings.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });

  res.json({
    data: userBookings,
    total: userBookings.length
  });
});

// GET /api/slots/provider/schedule - Get provider's schedule
router.get('/provider/schedule', authenticateToken, (req, res) => {
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Only providers can access this endpoint' });
  }

  const { date, startDate, endDate } = req.query;

  let providerSlots = timeSlots.filter(s => s.providerId === req.user.id);

  if (date) {
    providerSlots = providerSlots.filter(s => s.date === date);
  }

  if (startDate) {
    providerSlots = providerSlots.filter(s => s.date >= startDate);
  }

  if (endDate) {
    providerSlots = providerSlots.filter(s => s.date <= endDate);
  }

  // Get bookings for these slots
  const schedule = providerSlots.map(slot => {
    const booking = customerBookings.find(b => b.slotId === slot.id);
    return {
      ...slot,
      booking: booking || null
    };
  });

  res.json({
    data: schedule,
    total: schedule.length
  });
});

// POST /api/slots/provider/service - Create a new service (Provider only)
router.post('/provider/service', authenticateToken, (req, res) => {
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Only providers can create services' });
  }

  const { name, description, category, duration, price } = req.body;

  if (!name || !duration || !price) {
    return res.status(400).json({ error: 'Name, duration, and price are required' });
  }

  const newService = {
    id: `SRV-${uuidv4().slice(0, 8).toUpperCase()}`,
    providerId: req.user.id,
    providerName: req.user.businessName || req.user.name,
    name,
    description: description || '',
    category: category || req.user.role.replace('_', ' '),
    duration: parseInt(duration),
    price: parseFloat(price),
    currency: 'INR',
    status: 'active',
    capacity: 1,
    bookings: 0,
    rating: 0,
    createdAt: new Date().toISOString()
  };

  providerServices.push(newService);

  res.status(201).json({
    success: true,
    message: 'Service created successfully',
    service: newService
  });
});

// PUT /api/slots/provider/service/:serviceId - Update a service
router.put('/provider/service/:serviceId', authenticateToken, (req, res) => {
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Only providers can update services' });
  }

  const serviceIndex = providerServices.findIndex(
    s => s.id === req.params.serviceId && s.providerId === req.user.id
  );

  if (serviceIndex === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const { name, description, duration, price, status } = req.body;

  if (name) providerServices[serviceIndex].name = name;
  if (description !== undefined) providerServices[serviceIndex].description = description;
  if (duration) providerServices[serviceIndex].duration = parseInt(duration);
  if (price) providerServices[serviceIndex].price = parseFloat(price);
  if (status) providerServices[serviceIndex].status = status;

  res.json({
    success: true,
    message: 'Service updated successfully',
    service: providerServices[serviceIndex]
  });
});

// DELETE /api/slots/provider/service/:serviceId
router.delete('/provider/service/:serviceId', authenticateToken, (req, res) => {
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Only providers can delete services' });
  }

  const serviceIndex = providerServices.findIndex(
    s => s.id === req.params.serviceId && s.providerId === req.user.id
  );

  if (serviceIndex === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }

  providerServices.splice(serviceIndex, 1);

  res.json({
    success: true,
    message: 'Service deleted successfully'
  });
});

// POST /api/slots/provider/slots - Create time slots (Provider only)
router.post('/provider/slots', authenticateToken, (req, res) => {
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Only providers can create slots' });
  }

  const { date, slots } = req.body; // slots is array of {time, duration}

  if (!date || !slots || !Array.isArray(slots)) {
    return res.status(400).json({ error: 'Date and slots array are required' });
  }

  const createdSlots = [];

  slots.forEach(({ time, duration = 30 }) => {
    // Check if slot already exists
    const existing = timeSlots.find(
      s => s.date === date && s.time === time && s.providerId === req.user.id
    );

    if (!existing) {
      const newSlot = {
        id: `SLOT-${uuidv4().slice(0, 8)}`,
        providerId: req.user.id,
        date,
        time,
        duration,
        status: 'available',
        capacity: 1,
        bookedBy: null,
        bookingId: null
      };
      timeSlots.push(newSlot);
      createdSlots.push(newSlot);
    }
  });

  res.status(201).json({
    success: true,
    message: `${createdSlots.length} slots created`,
    slots: createdSlots
  });
});

// GET /api/slots/provider/stats - Get provider statistics
router.get('/provider/stats', authenticateToken, (req, res) => {
  if (req.user.role === 'customer') {
    return res.status(403).json({ error: 'Only providers can access this endpoint' });
  }

  const myServices = providerServices.filter(s => s.providerId === req.user.id);
  const myBookings = customerBookings.filter(b => b.providerId === req.user.id);
  
  const confirmedBookings = myBookings.filter(b => b.status === 'confirmed');
  const pendingBookings = myBookings.filter(b => b.status === 'pending');
  const todayBookings = myBookings.filter(b => b.date === new Date().toISOString().split('T')[0]);

  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.price, 0);
  const avgRating = myServices.length > 0 
    ? myServices.reduce((sum, s) => sum + s.rating, 0) / myServices.length 
    : 0;

  res.json({
    stats: {
      revenue: {
        value: totalRevenue,
        label: 'Total Revenue',
        trend: 12.5,
        comparison: 'vs last month'
      },
      bookings: {
        value: myBookings.length,
        label: 'Total Bookings',
        trend: 8.2,
        comparison: `${pendingBookings.length} pending`
      },
      todayBookings: {
        value: todayBookings.length,
        label: 'Today\'s Bookings',
        trend: 0,
        comparison: 'scheduled for today'
      },
      rating: {
        value: avgRating.toFixed(1),
        label: 'Avg. Rating',
        trend: 0.3,
        comparison: `Based on ${myBookings.length} reviews`
      }
    },
    services: myServices,
    recentBookings: myBookings.slice(0, 10)
  });
});

module.exports = router;
module.exports.providerServices = providerServices;
module.exports.customerBookings = customerBookings;
module.exports.timeSlots = timeSlots;
