const express = require('express');
const router = express.Router();
const { payments } = require('../data/mockData');

// GET /api/payments
router.get('/', (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
  
  let filteredPayments = [...payments];
  
  // Filter by status
  if (status) {
    filteredPayments = filteredPayments.filter(p => p.status === status);
  }
  
  // Filter by date range
  if (startDate) {
    filteredPayments = filteredPayments.filter(p => p.date >= startDate);
  }
  if (endDate) {
    filteredPayments = filteredPayments.filter(p => p.date <= endDate);
  }
  
  // Sort by date (newest first)
  filteredPayments.sort((a, b) => b.date.localeCompare(a.date));
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
  
  // Calculate totals
  const totals = {
    total: filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    completed: filteredPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
    pending: filteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    refunded: filteredPayments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0)
  };
  
  res.json({
    data: paginatedPayments,
    totals,
    pagination: {
      total: filteredPayments.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(filteredPayments.length / limit)
    }
  });
});

// GET /api/payments/:id
router.get('/:id', (req, res) => {
  const payment = payments.find(p => p.id === req.params.id);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  res.json(payment);
});

// POST /api/payments/:id/refund
router.post('/:id/refund', (req, res) => {
  const index = payments.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  if (payments[index].status !== 'completed') {
    return res.status(400).json({ error: 'Only completed payments can be refunded' });
  }
  
  payments[index].status = 'refunded';
  payments[index].refundedAt = new Date().toISOString();
  
  res.json(payments[index]);
});

// GET /api/payments/export
router.get('/export/csv', (req, res) => {
  const { startDate, endDate } = req.query;
  
  let filteredPayments = [...payments];
  
  if (startDate) {
    filteredPayments = filteredPayments.filter(p => p.date >= startDate);
  }
  if (endDate) {
    filteredPayments = filteredPayments.filter(p => p.date <= endDate);
  }
  
  // Generate CSV
  const headers = ['Transaction ID', 'Customer', 'Service', 'Date', 'Amount', 'Status'];
  const rows = filteredPayments.map(p => [
    p.id,
    p.customerName,
    p.service,
    p.date,
    p.amount.toFixed(2),
    p.status
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
  res.send(csv);
});

module.exports = router;
