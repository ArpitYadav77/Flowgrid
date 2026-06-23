// ─── Service Routes ─────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticateToken } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const { validateRequired } = require('../middleware/validate');

// Public
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getService);

// Provider-only
router.post('/', authenticateToken, roleGuard('PROVIDER', 'ADMIN'), validateRequired('name', 'duration', 'price'), serviceController.createService);
router.put('/:id', authenticateToken, roleGuard('PROVIDER', 'ADMIN'), serviceController.updateService);
router.delete('/:id', authenticateToken, roleGuard('PROVIDER', 'ADMIN'), serviceController.deleteService);

module.exports = router;
