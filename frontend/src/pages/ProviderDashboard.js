import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { slotsAPI, razorpayAPI } from '../services/api';
import * as Icons from '../components/Icons';
import StatCard from '../components/StatCard';

const ProviderDashboard = ({ activeTab: propActiveTab, onTabChange }) => {
  const { user, getRoleDisplayName } = useAuth();
  const { showNotification } = useNotification();

  const [stats, setStats] = useState({
    revenue: { value: 0, label: 'Total Revenue', trend: 0, comparison: '' },
    bookings: { value: 0, label: 'Total Bookings', trend: 0, comparison: '' },
    todayBookings: { value: 0, label: "Today's Bookings", trend: 0, comparison: '' },
    rating: { value: 0, label: 'Avg. Rating', trend: 0, comparison: '' }
  });
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState(propActiveTab || 'overview');
  const [loading, setLoading] = useState(true);

  // Service form state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    duration: 30,
    price: ''
  });

  // Fetch provider data
  useEffect(() => {
    fetchProviderData();
  }, []);

  // Sync activeTab with prop
  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  // Fetch payments when tab changes
  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    }
  }, [activeTab]);

  const fetchProviderData = async () => {
    setLoading(true);
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        slotsAPI.getProviderStats(),
        slotsAPI.getBookings()
      ]);
      
      setStats(statsRes.data.stats);
      setServices(statsRes.data.services || []);
      setBookings(bookingsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch provider data:', error);
      showNotification('Failed to load dashboard data', 'error');
    }
    setLoading(false);
  };

  const fetchPayments = async () => {
    try {
      const response = await razorpayAPI.getPayments();
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      showNotification('Failed to load payments', 'error');
    }
  };

  const handleServiceFormChange = (e) => {
    setServiceForm({
      ...serviceForm,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await slotsAPI.updateService(editingService.id, serviceForm);
        showNotification('Service updated successfully', 'success');
      } else {
        await slotsAPI.createService(serviceForm);
        showNotification('Service created successfully', 'success');
      }
      setShowServiceForm(false);
      setEditingService(null);
      setServiceForm({ name: '', description: '', duration: 30, price: '' });
      fetchProviderData();
    } catch (error) {
      showNotification('Failed to save service', 'error');
    }
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price
    });
    setShowServiceForm(true);
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await slotsAPI.deleteService(serviceId);
      showNotification('Service deleted', 'success');
      fetchProviderData();
    } catch (error) {
      showNotification('Failed to delete service', 'error');
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      // For now, just update locally
      showNotification(`Booking ${newStatus}`, 'success');
      fetchProviderData();
    } catch (error) {
      showNotification('Failed to update booking', 'error');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', text: 'Pending' },
      confirmed: { class: 'badge-success', text: 'Confirmed' },
      cancelled: { class: 'badge-error', text: 'Cancelled' },
      completed: { class: 'badge-info', text: 'Completed' }
    };
    return badges[status] || { class: '', text: status };
  };

  const statCards = [
    { ...stats.revenue, icon: 'DollarSign', format: 'currency' },
    { ...stats.bookings, icon: 'Calendar' },
    { ...stats.todayBookings, icon: 'Clock' },
    { ...stats.rating, icon: 'Star' }
  ];

  const todaysBookings = bookings.filter(b => 
    b.date === new Date().toISOString().split('T')[0] && 
    b.status !== 'cancelled'
  );

  const upcomingBookings = bookings.filter(b => 
    b.date >= new Date().toISOString().split('T')[0] && 
    b.status !== 'cancelled'
  ).slice(0, 10);

  return (
    <div className="dashboard-content provider-dashboard">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            {user?.businessName || user?.name}
          </h1>
          <p className="page-subtitle">
            {getRoleDisplayName(user?.role)} Dashboard
          </p>
        </div>
        <div className="page-header-right">
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingService(null);
              setServiceForm({ name: '', description: '', duration: 30, price: '' });
              setShowServiceForm(true);
            }}
          >
            <Icons.Plus />
            Add Service
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <StatCard 
            key={index} 
            {...stat} 
            value={stat.format === 'currency' ? formatCurrency(stat.value) : stat.value}
          />
        ))}
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('overview');
            onTabChange?.('dashboard');
          }}
        >
          <Icons.Grid size={20} />
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('services');
            onTabChange?.('services');
          }}
        >
          <Icons.Layers size={20} />
          My Services
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('bookings');
            onTabChange?.('bookings');
          }}
        >
          <Icons.Calendar size={20} />
          Bookings
          {todaysBookings.length > 0 && (
            <span className="tab-badge">{todaysBookings.length}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('payments');
            onTabChange?.('payments');
          }}
        >
          <Icons.CreditCard size={20} />
          Payments
        </button>
      </div>

      {/* Service Form Modal */}
      {showServiceForm && (
        <div className="modal-overlay" onClick={() => setShowServiceForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingService ? 'Edit Service' : 'Add New Service'}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowServiceForm(false)}
              >
                <Icons.X />
              </button>
            </div>
            <form onSubmit={handleCreateService} className="modal-body">
              <div className="form-group">
                <label className="form-label">Service Name</label>
                <input
                  type="text"
                  name="name"
                  value={serviceForm.name}
                  onChange={handleServiceFormChange}
                  placeholder="e.g., Haircut, Math Tutoring"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={serviceForm.description}
                  onChange={handleServiceFormChange}
                  placeholder="Describe your service..."
                  className="form-input form-textarea"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <select
                    name="duration"
                    value={serviceForm.duration}
                    onChange={handleServiceFormChange}
                    className="form-input"
                  >
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={serviceForm.price}
                    onChange={handleServiceFormChange}
                    placeholder="299"
                    className="form-input"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowServiceForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="content-grid">
          {/* Today's Schedule */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Today's Schedule</h2>
              <span className="card-subtitle">
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </span>
            </div>
            <div className="card-body">
              {todaysBookings.length === 0 ? (
                <div className="empty-state small">
                  <Icons.Calendar />
                  <p>No bookings for today</p>
                </div>
              ) : (
                <div className="schedule-list">
                  {todaysBookings.map(booking => (
                    <div key={booking.id} className="schedule-item">
                      <div className="schedule-time">{booking.time}</div>
                      <div className="schedule-details">
                        <strong>{booking.serviceName}</strong>
                        <span>{booking.customerName}</span>
                      </div>
                      <span className={`badge ${getStatusBadge(booking.status).class}`}>
                        {getStatusBadge(booking.status).text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Services Overview */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">My Services</h2>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('services')}
              >
                View All
              </button>
            </div>
            <div className="card-body">
              {services.length === 0 ? (
                <div className="empty-state small">
                  <Icons.Layers />
                  <p>No services yet</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowServiceForm(true)}
                  >
                    Add Service
                  </button>
                </div>
              ) : (
                <div className="services-mini-list">
                  {services.slice(0, 4).map(service => (
                    <div key={service.id} className="service-mini-item">
                      <div className="service-mini-info">
                        <strong>{service.name}</strong>
                        <span>{service.duration} min • {formatCurrency(service.price)}</span>
                      </div>
                      <div className="service-mini-stats">
                        <span className="service-bookings">{service.bookings} bookings</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="card card-large">
            <div className="card-header">
              <h2 className="card-title">Upcoming Bookings</h2>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('bookings')}
              >
                View All
              </button>
            </div>
            <div className="card-body">
              {upcomingBookings.length === 0 ? (
                <div className="empty-state">
                  <Icons.Calendar />
                  <p>No upcoming bookings</p>
                </div>
              ) : (
                <div className="bookings-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Date & Time</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingBookings.map(booking => (
                        <tr key={booking.id}>
                          <td>
                            <div className="customer-cell">
                              <div className="customer-avatar">
                                {booking.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span>{booking.customerName}</span>
                            </div>
                          </td>
                          <td>{booking.serviceName}</td>
                          <td>
                            {formatDate(booking.date)} • {booking.time}
                          </td>
                          <td>{formatCurrency(booking.price)}</td>
                          <td>
                            <span className={`badge ${getStatusBadge(booking.status).class}`}>
                              {getStatusBadge(booking.status).text}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="services-management">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Manage Services</h2>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setEditingService(null);
                  setServiceForm({ name: '', description: '', duration: 30, price: '' });
                  setShowServiceForm(true);
                }}
              >
                <Icons.Plus />
                Add Service
              </button>
            </div>
            <div className="card-body">
              {services.length === 0 ? (
                <div className="empty-state">
                  <Icons.Layers />
                  <h3>No services yet</h3>
                  <p>Create your first service to start accepting bookings</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowServiceForm(true)}
                  >
                    <Icons.Plus />
                    Add Your First Service
                  </button>
                </div>
              ) : (
                <div className="services-management-grid">
                  {services.map(service => (
                    <div key={service.id} className="service-management-card">
                      <div className="service-management-header">
                        <h3>{service.name}</h3>
                        <div className="service-actions">
                          <button 
                            className="icon-btn"
                            onClick={() => handleEditService(service)}
                            title="Edit"
                          >
                            <Icons.Edit />
                          </button>
                          <button 
                            className="icon-btn danger"
                            onClick={() => handleDeleteService(service.id)}
                            title="Delete"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                      {service.description && (
                        <p className="service-description">{service.description}</p>
                      )}
                      <div className="service-management-meta">
                        <div className="meta-item">
                          <Icons.Clock />
                          <span>{service.duration} min</span>
                        </div>
                        <div className="meta-item">
                          <Icons.DollarSign />
                          <span>{formatCurrency(service.price)}</span>
                        </div>
                        <div className="meta-item">
                          <Icons.Users />
                          <span>{service.bookings} bookings</span>
                        </div>
                        {service.rating > 0 && (
                          <div className="meta-item">
                            <Icons.Star />
                            <span>{service.rating}</span>
                          </div>
                        )}
                      </div>
                      <div className={`service-status ${service.status}`}>
                        {service.status === 'active' ? 'Active' : 'Paused'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bookings-management">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">All Bookings</h2>
            </div>
            <div className="card-body">
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <Icons.Calendar />
                  <h3>No bookings yet</h3>
                  <p>Bookings will appear here when customers book your services</p>
                </div>
              ) : (
                <div className="bookings-full-list">
                  {bookings.map(booking => (
                    <div key={booking.id} className="booking-full-item">
                      <div className="booking-full-main">
                        <div className="booking-avatar">
                          {booking.customerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="booking-full-info">
                          <h4>{booking.customerName}</h4>
                          <p>{booking.serviceName}</p>
                          <div className="booking-full-meta">
                            <span><Icons.Calendar /> {formatDate(booking.date)}</span>
                            <span><Icons.Clock /> {booking.time}</span>
                            <span><Icons.DollarSign /> {formatCurrency(booking.price)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="booking-full-actions">
                        <span className={`badge ${getStatusBadge(booking.status).class}`}>
                          {getStatusBadge(booking.status).text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="payments-management">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Payment History</h2>
              <p className="card-subtitle">Payments received from Razorpay</p>
            </div>
            <div className="card-body">
              {payments.length === 0 ? (
                <div className="empty-state">
                  <Icons.CreditCard />
                  <h3>No payments yet</h3>
                  <p>Payments will appear here when customers complete bookings</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            <span className="transaction-id">#{payment.id}</span>
                          </td>
                          <td>
                            <div className="customer-info">
                              <div className="customer-avatar">
                                {payment.customerInitials}
                              </div>
                              <span>{payment.customerName}</span>
                            </div>
                          </td>
                          <td>{payment.serviceName}</td>
                          <td>{formatDate(payment.date)}</td>
                          <td>
                            <span className="amount">{formatCurrency(payment.amount)}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${payment.status}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
