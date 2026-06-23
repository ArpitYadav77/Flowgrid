// ─── Booking Routes ─────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { authenticateToken } = require('../middleware/auth');
const { validateRequired } = require('../middleware/validate');

// All booking routes require authentication
router.use(authenticateToken);

router.post('/', validateRequired('providerId', 'serviceId', 'timeSlotId', 'date', 'startTime'), bookingController.createBooking);
router.get('/', bookingController.getBookings);
router.get('/:id', bookingController.getBooking);
router.post('/:id/cancel', bookingController.cancelBooking);
router.post('/:id/complete', bookingController.completeBooking);

module.exports = router;
