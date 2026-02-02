const express = require('express');
const router = express.Router();
const { dashboardData, calendarBookings } = require('../data/mockData');

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  const { period } = req.query; // today, week, month, year
  
  // In a real app, filter data based on period
  let stats = { ...dashboardData.stats };
  
  // Simulate different data for different periods
  if (period === 'week') {
    stats.revenue.value = Math.round(stats.revenue.value * 0.25);
    stats.bookings.value = Math.round(stats.bookings.value * 0.3);
  } else if (period === 'year') {
    stats.revenue.value = Math.round(stats.revenue.value * 12);
    stats.bookings.value = Math.round(stats.bookings.value * 10);
  }
  
  res.json(stats);
});

// GET /api/dashboard/calendar
router.get('/calendar', (req, res) => {
  const { month, year } = req.query;
  
  // Return bookings count by date for the calendar view
  res.json(calendarBookings);
});

// GET /api/dashboard/summary
router.get('/summary', (req, res) => {
  res.json({
    ...dashboardData,
    lastUpdated: new Date().toISOString()
  });
});

module.exports = router;
