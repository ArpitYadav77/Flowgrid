// ─── Review Routes ──────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticateToken } = require('../middleware/auth');
const { validateRequired } = require('../middleware/validate');

// Public
router.get('/service/:serviceId', reviewController.getServiceReviews);

// Protected
router.post('/', authenticateToken, validateRequired('bookingId', 'rating'), reviewController.createReview);
router.get('/my', authenticateToken, reviewController.getMyReviews);

module.exports = router;
