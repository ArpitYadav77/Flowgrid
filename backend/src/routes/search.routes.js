// ─── Search Routes ──────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');

// Public endpoints
router.get('/nearby', searchController.searchNearby);
router.get('/services', searchController.searchServices);

module.exports = router;
