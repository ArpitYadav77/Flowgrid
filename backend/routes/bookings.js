const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { bookings, services } = require('../data/mockData');

// GET /api/bookings
router.get('/', (req, res) => {
  const { date, status, serviceId, page = 1, limit = 10 } = req.query;
  
  let filteredBookings = [...bookings];
  
  // Filter by date
  if (date) {
    filteredBookings = filteredBookings.filter(b => b.date === date);
  }
  
  // Filter by status
  if (status) {
    filteredBookings = filteredBookings.filter(b => b.status === status);
  }
  
  // Filter by service
  if (serviceId) {
    filteredBookings = filteredBookings.filter(b => b.serviceId === serviceId);
  }
  
  // Sort by date and time
  filteredBookings.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedBookings,
    pagination: {
      total: filteredBookings.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredBookings.length / limit)
    }
  });
});

// GET /api/bookings/today
router.get('/today', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings
    .filter(b => b.date === today || b.date === '2026-01-31') // Using mock date
    .sort((a, b) => a.time.localeCompare(b.time));
  
  // Add available slots
  const slots = [
    { time: '09:00', duration: 60 },
    { time: '10:30', duration: 90 },
    { time: '12:00', duration: 60 },
    { time: '14:00', duration: 180 },
    { time: '17:30', duration: 60 }
  ];
  
  const schedule = slots.map(slot => {
    const booking = todayBookings.find(b => b.time === slot.time);
    if (booking) {
      return {
        ...booking,
        type: 'booked'
      };
    }
    return {
      time: slot.time,
      duration: slot.duration,
      type: 'available',
      serviceName: 'Available Slot',
      clientName: 'Open for booking'
    };
  });
  
  res.json(schedule);
});

// GET /api/bookings/:id
router.get('/:id', (req, res) => {
  const booking = bookings.find(b => b.id === req.params.id);
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  res.json(booking);
});

// POST /api/bookings
router.post('/', (req, res) => {
  const { serviceId, clientName, clientEmail, date, time } = req.body;
  
  if (!serviceId || !clientName || !clientEmail || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const service = services.find(s => s.id === serviceId);
  if (!service) {
    return res.status(400).json({ error: 'Invalid service ID' });
  }
  
  // Check for conflicts
  const conflict = bookings.find(b => b.date === date && b.time === time);
  if (conflict) {
    return res.status(409).json({ error: 'Time slot already booked' });
  }
  
  const newBooking = {
    id: `BKG-${uuidv4().slice(0, 3).toUpperCase()}`,
    serviceId,
    serviceName: service.name,
    clientName,
    clientEmail,
    date,
    time,
    duration: service.duration,
    status: 'pending'
  };
  
  bookings.push(newBooking);
  res.status(201).json(newBooking);
});

// PUT /api/bookings/:id
router.put('/:id', (req, res) => {
  const index = bookings.findIndex(b => b.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  bookings[index] = { ...bookings[index], ...req.body };
  res.json(bookings[index]);
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const index = bookings.findIndex(b => b.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  bookings[index].status = status;
  res.json(bookings[index]);
});

// DELETE /api/bookings/:id
router.delete('/:id', (req, res) => {
  const index = bookings.findIndex(b => b.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  bookings.splice(index, 1);
  res.json({ message: 'Booking cancelled successfully' });
});

module.exports = router;
