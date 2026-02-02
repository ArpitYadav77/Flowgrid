const express = require('express');
const router = express.Router();
const { users, currentUser } = require('../data/mockData');

// GET /api/users/me
router.get('/me', (req, res) => {
  res.json(currentUser);
});

// GET /api/users
router.get('/', (req, res) => {
  const { role, search, page = 1, limit = 10 } = req.query;
  
  let filteredUsers = [...users];
  
  // Filter by role
  if (role) {
    filteredUsers = filteredUsers.filter(u => u.role === role);
  }
  
  // Search by name or email
  if (search) {
    const searchLower = search.toLowerCase();
    filteredUsers = filteredUsers.filter(u => 
      u.name.toLowerCase().includes(searchLower) ||
      u.email.toLowerCase().includes(searchLower)
    );
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedUsers,
    pagination: {
      total: filteredUsers.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredUsers.length / limit)
    }
  });
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Don't allow changing role or id
  const { role, id, ...updateData } = req.body;
  
  users[index] = { ...users[index], ...updateData };
  res.json(users[index]);
});

module.exports = router;
