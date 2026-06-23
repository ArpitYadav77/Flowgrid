// ─── Provider Routes ────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller');
const { authenticateToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// All provider routes require authentication + PROVIDER role
router.use(authenticateToken);
router.use(roleGuard('PROVIDER', 'ADMIN'));

router.get('/dashboard', providerController.getDashboard);
router.get('/schedule', providerController.getSchedule);
router.post('/slots', providerController.setAvailability);
router.get('/slots', providerController.getSlots);
router.post('/bookings/:id/accept', providerController.acceptBooking);
router.post('/bookings/:id/reject', providerController.rejectBooking);

module.exports = router;
