// ─── Admin Routes ───────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

// All admin routes require ADMIN role
router.use(authenticateToken);
router.use(roleGuard('ADMIN'));

router.get('/users', adminController.getUsers);
router.get('/providers', adminController.getProviders);
router.get('/bookings', adminController.getBookings);
router.get('/analytics', adminController.getAnalytics);
router.patch('/providers/:id/verify', adminController.verifyProvider);

module.exports = router;
