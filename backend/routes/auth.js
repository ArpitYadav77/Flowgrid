const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { generateToken, authenticateToken } = require('../middleware/auth');

// In-memory user store (replace with database in production)
let registeredUsers = [];

// Available roles
const ROLES = ['customer', 'salon_owner', 'tutor', 'car_washer', 'service_provider'];

// Simple password hashing (use bcrypt in production)
const hashPassword = (password) => {
  // Simple hash for demo - use bcrypt in production
  return Buffer.from(password).toString('base64');
};

const verifyPassword = (password, hash) => {
  return Buffer.from(password).toString('base64') === hash;
};

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role selected' });
  }

  // Check if email exists
  const existingUser = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Create user
  const newUser = {
    id: `USR-${uuidv4().slice(0, 8).toUpperCase()}`,
    name,
    email: email.toLowerCase(),
    password: hashPassword(password),
    role,
    initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    createdAt: new Date().toISOString(),
    isFirstLogin: true,
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

  // Generate token
  const token = generateToken(newUser);

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    message: 'Account created successfully',
    user: userWithoutPassword,
    token,
    isFirstLogin: true
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user
  const user = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password
  if (!verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check if first login
  const isFirstLogin = user.isFirstLogin;
  
  // Update first login status
  if (isFirstLogin) {
    user.isFirstLogin = false;
  }

  // Generate token
  const token = generateToken(user);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
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

// Demo: Create default test users
const initializeDefaultUsers = () => {
  const defaultUsers = [
    {
      id: 'USR-CUSTOMER-01',
      name: 'Rahul Sharma',
      email: 'customer@flowgrid.com',
      password: hashPassword('password123'),
      role: 'customer',
      initials: 'RS',
      createdAt: '2025-06-15T00:00:00.000Z',
      isFirstLogin: false,
      bookings: [],
      totalSpent: 0
    },
    {
      id: 'USR-SALON-01',
      name: 'Priya\'s Beauty Salon',
      email: 'salon@flowgrid.com',
      password: hashPassword('password123'),
      role: 'salon_owner',
      initials: 'PS',
      createdAt: '2025-03-10T00:00:00.000Z',
      isFirstLogin: false,
      businessName: 'Priya\'s Beauty Salon',
      services: [],
      revenue: 45600,
      totalBookings: 234
    },
    {
      id: 'USR-TUTOR-01',
      name: 'Amit Kumar',
      email: 'tutor@flowgrid.com',
      password: hashPassword('password123'),
      role: 'tutor',
      initials: 'AK',
      createdAt: '2025-04-20T00:00:00.000Z',
      isFirstLogin: false,
      businessName: 'Amit\'s Math Academy',
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
