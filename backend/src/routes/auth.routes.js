// ─── Auth Routes ────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken, refreshAccessToken } = require('../middleware/auth');
const { validateRequired, validateEmail, validatePassword } = require('../middleware/validate');

// Public routes
router.post('/signup', validateRequired('name', 'email', 'password'), validateEmail, validatePassword, authController.signup);
router.post('/verify-otp', validateRequired('email', 'otp'), authController.verifyOTP);
router.post('/resend-otp', validateRequired('email'), authController.resendOTP);
router.post('/login', validateRequired('email', 'password'), authController.login);
router.post('/refresh-token', refreshAccessToken);
router.get('/smtp-test', authController.testSMTP);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);
router.post('/logout-all', authenticateToken, authController.logoutAll);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/complete-first-login', authenticateToken, authController.completeFirstLogin);

module.exports = router;
