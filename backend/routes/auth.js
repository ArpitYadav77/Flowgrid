const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { generateOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/mailer');

// In-memory user store (replace with a real DB in production)
let registeredUsers = [];

// Available roles
const ROLES = ['customer', 'salon_owner', 'tutor', 'car_washer', 'service_provider'];

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;

  // Basic field validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role selected' });
  }

  // Email format validation
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Strong password enforcement
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character (@$!%*?&)'
    });
  }

  // Check if email exists
  const existingUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Hash password with bcrypt (salt rounds = 12)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Generate OTP for email verification
  const { code: otpCode, expiresAt: otpExpiresAt } = generateOTP();

  // Create user — inactive until email is verified
  const newUser = {
    id: `USR-${uuidv4().slice(0, 8).toUpperCase()}`,
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    createdAt: new Date().toISOString(),
    isFirstLogin: true,
    isEmailVerified: false,
    otp: otpCode,
    otpExpiresAt,
    // Provider-specific fields
    ...(role !== 'customer' && {
      businessName: '',
      services: [],
      revenue: 0,
      totalBookings: 0
    }),
    // Customer-specific fields
    ...(role === 'customer' && {
      bookings: [],
      totalSpent: 0
    })
  };

  registeredUsers.push(newUser);

  // Always log OTP to console for dev/testing (visible in backend terminal)
  console.log('\n' + '='.repeat(50));
  console.log(`[OTP] Email  : ${newUser.email}`);
  console.log(`[OTP] Code   : ${otpCode}`);
  console.log(`[OTP] Expires: ${otpExpiresAt.toISOString()}`);
  console.log('='.repeat(50) + '\n');

  // Attempt to send email (requires SMTP config in .env)
  try {
    await sendOTPEmail(newUser.email, otpCode);
    console.log(`[OTP] Email sent to ${newUser.email}`);
  } catch (emailErr) {
    console.warn(`[OTP] Email delivery failed: ${emailErr.message}`);
    console.warn('[OTP] Configure SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env to enable email delivery.');
  }

  res.status(201).json({
    message: 'Account created. Please check your email for the verification code.',
    pendingVerification: true,
    email: newUser.email
  });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const user = registeredUsers.find(u => u.email === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({ error: 'Email is already verified. Please sign in.' });
  }

  if (user.otp !== otp || new Date() > new Date(user.otpExpiresAt)) {
    return res.status(400).json({ error: 'Invalid or expired OTP. Request a new one.' });
  }

  // Activate account
  user.isEmailVerified = true;
  user.otp = null;
  user.otpExpiresAt = null;

  // Issue JWT only after successful verification
  const token = generateToken(user);
  const { password: _, otp: _otp, otpExpiresAt: _exp, ...userWithoutSensitive } = user;

  res.json({
    message: 'Email verified successfully. Welcome to FlowGrid!',
    user: userWithoutSensitive,
    token,
    isFirstLogin: true
  });
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = registeredUsers.find(u => u.email === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({ error: 'Email is already verified.' });
  }

  const { code: otpCode, expiresAt: otpExpiresAt } = generateOTP();
  user.otp = otpCode;
  user.otpExpiresAt = otpExpiresAt;

  // Log resent OTP to console
  console.log('\n' + '='.repeat(50));
  console.log(`[OTP RESEND] Email  : ${user.email}`);
  console.log(`[OTP RESEND] Code   : ${otpCode}`);
  console.log(`[OTP RESEND] Expires: ${otpExpiresAt.toISOString()}`);
  console.log('='.repeat(50) + '\n');

  try {
    await sendOTPEmail(user.email, otpCode);
    console.log(`[OTP] Resend email sent to ${user.email}`);
  } catch (emailErr) {
    console.warn(`[OTP] Resend email failed: ${emailErr.message}`);
  }

  res.json({ message: 'A new verification code has been sent to your email.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user
  const user = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Block login for unverified accounts
  if (!user.isEmailVerified) {
    return res.status(403).json({
      error: 'Please verify your email before logging in.',
      pendingVerification: true,
      email: user.email
    });
  }

  // Verify password with bcrypt
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isFirstLogin = user.isFirstLogin;
  if (isFirstLogin) {
    user.isFirstLogin = false;
  }

  const token = generateToken(user);
  const { password: _, otp: _otp, otpExpiresAt: _exp, ...userWithoutSensitive } = user;

  res.json({
    message: 'Login successful',
    user: userWithoutSensitive,
    token,
    isFirstLogin
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  // In a real app, you'd invalidate the token here
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = registeredUsers.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  const userIndex = registeredUsers.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, businessName, phone, address } = req.body;
  
  if (name) registeredUsers[userIndex].name = name;
  if (businessName) registeredUsers[userIndex].businessName = businessName;
  if (phone) registeredUsers[userIndex].phone = phone;
  if (address) registeredUsers[userIndex].address = address;

  const { password: _, ...userWithoutPassword } = registeredUsers[userIndex];
  res.json(userWithoutPassword);
});

// POST /api/auth/complete-first-login
router.post('/complete-first-login', authenticateToken, (req, res) => {
  const user = registeredUsers.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.isFirstLogin = false;
  res.json({ message: 'First login completed' });
});

// Demo: Create default test users (pre-verified so demo accounts work immediately)
const initializeDefaultUsers = () => {
  // 10 rounds for fast startup seed data; real signups use 12 rounds
  const demoHash = bcrypt.hashSync('Demo@1234', 10);

  const defaultUsers = [
    {
      id: 'USR-CUSTOMER-01',
      name: 'Rahul Sharma',
      email: 'customer@flowgrid.com',
      password: demoHash,
      role: 'customer',
      initials: 'RS',
      createdAt: '2025-06-15T00:00:00.000Z',
      isFirstLogin: false,
      isEmailVerified: true,
      otp: null,
      otpExpiresAt: null,
      bookings: [],
      totalSpent: 0
    },
    {
      id: 'USR-SALON-01',
      name: "Priya's Beauty Salon",
      email: 'salon@flowgrid.com',
      password: demoHash,
      role: 'salon_owner',
      initials: 'PS',
      createdAt: '2025-03-10T00:00:00.000Z',
      isFirstLogin: false,
      isEmailVerified: true,
      otp: null,
      otpExpiresAt: null,
      businessName: "Priya's Beauty Salon",
      services: [],
      revenue: 45600,
      totalBookings: 234
    },
    {
      id: 'USR-TUTOR-01',
      name: 'Amit Kumar',
      email: 'tutor@flowgrid.com',
      password: demoHash,
      role: 'tutor',
      initials: 'AK',
      createdAt: '2025-04-20T00:00:00.000Z',
      isFirstLogin: false,
      isEmailVerified: true,
      otp: null,
      otpExpiresAt: null,
      businessName: "Amit's Math Academy",
      services: [],
      revenue: 28900,
      totalBookings: 156
    }
  ];

  registeredUsers = [...defaultUsers];
};

initializeDefaultUsers();

// Export for use in other modules
module.exports = router;
module.exports.registeredUsers = registeredUsers;
