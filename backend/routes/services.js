const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { services } = require('../data/mockData');

// GET /api/services
router.get('/', (req, res) => {
  const { status, category, page = 1, limit = 10 } = req.query;
  
  let filteredServices = [...services];
  
  // Filter by status
  if (status) {
    filteredServices = filteredServices.filter(s => s.status === status);
  }
  
  // Filter by category
  if (category) {
    filteredServices = filteredServices.filter(s => s.category.toLowerCase() === category.toLowerCase());
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedServices = filteredServices.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedServices,
    pagination: {
      total: filteredServices.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredServices.length / limit)
    }
  });
});

// GET /api/services/:id
router.get('/:id', (req, res) => {
  const service = services.find(s => s.id === req.params.id);
  
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  res.json(service);
});

// POST /api/services
router.post('/', (req, res) => {
  const { name, category, duration, price, status = 'active' } = req.body;
  
  if (!name || !category || !duration || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const newService = {
    id: `SRV-${uuidv4().slice(0, 3).toUpperCase()}`,
    name,
    category,
    duration,
    price,
    bookings: 0,
    trend: 0,
    status,
    icon: 'consultation'
  };
  
  services.push(newService);
  res.status(201).json(newService);
});

// PUT /api/services/:id
router.put('/:id', (req, res) => {
  const index = services.findIndex(s => s.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  services[index] = { ...services[index], ...req.body };
  res.json(services[index]);
});

// DELETE /api/services/:id
router.delete('/:id', (req, res) => {
  const index = services.findIndex(s => s.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  services.splice(index, 1);
  res.json({ message: 'Service deleted successfully' });
});

// PATCH /api/services/:id/status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const index = services.findIndex(s => s.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  if (!['active', 'paused', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  services[index].status = status;
  res.json(services[index]);
});

module.exports = router;
