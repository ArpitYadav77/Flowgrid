import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import ServiceTable from '../components/ServiceTable';
import BookingCalendar from '../components/BookingCalendar';
import TimeSlots from '../components/TimeSlots';
import PaymentHistory from '../components/PaymentHistory';
import Pagination from '../components/Pagination';
import * as Icons from '../components/Icons';
import { useNotification } from '../context/NotificationContext';
import { dashboardAPI, servicesAPI, bookingsAPI, razorpayAPI } from '../services/api';

const Dashboard = () => {
  const { showNotification } = useNotification();
  const [activePeriod, setActivePeriod] = useState('today');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // State for data
  const [stats, setStats] = useState({
    revenue: { value: 48574, label: 'Total Revenue', trend: 12.5, comparison: 'vs $43,182 last month' },
    bookings: { value: 1284, label: 'Active Bookings', trend: 8.2, comparison: '142 pending confirmation' },
    users: { value: 3842, label: 'Total Users', trend: 24.3, comparison: '287 new this month' },
    rating: { value: 4.8, label: 'Avg. Rating', trend: 0.3, comparison: 'Based on 1,247 reviews' }
  });

  const [services, setServices] = useState([]);
  const [calendarBookings, setCalendarBookings] = useState({});
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [statsRes, servicesRes, calendarRes, scheduleRes, paymentsRes] = await Promise.all([
          dashboardAPI.getStats(activePeriod).catch(() => ({ data: stats })),
          servicesAPI.getAll({ page: currentPage, limit: 4 }).catch(() => ({ data: { data: [], pagination: {} } })),
          dashboardAPI.getCalendar().catch(() => ({ data: {} })),
          bookingsAPI.getToday().catch(() => ({ data: [] })),
          razorpayAPI.getPayments().catch(() => ({ data: { data: [] } }))
        ]);

        setStats(statsRes.data);
        setServices(servicesRes.data.data || servicesRes.data);
        setPagination(servicesRes.data.pagination || { total: 24, totalPages: 6 });
        setCalendarBookings(calendarRes.data);
        setTodaySchedule(scheduleRes.data);
        setPayments(paymentsRes.data.data || paymentsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Use default mock data on error
        setServices([
          { id: 'SRV-001', name: 'Strategy Consultation', category: 'Consulting', duration: 60, price: 150.00, bookings: 234, trend: 12, status: 'active', icon: 'consultation' },
          { id: 'SRV-002', name: 'Team Workshop', category: 'Training', duration: 180, price: 450.00, bookings: 89, trend: 8, status: 'active', icon: 'workshop' },
          { id: 'SRV-003', name: 'Process Audit', category: 'Assessment', duration: 120, price: 275.00, bookings: 156, trend: -3, status: 'paused', icon: 'audit' },
          { id: 'SRV-004', name: 'Executive Coaching', category: 'Premium', duration: 90, price: 350.00, bookings: 67, trend: 18, status: 'active', icon: 'premium' }
        ]);
        setCalendarBookings({
          '2026-01-05': 1, '2026-01-06': 2, '2026-01-08': 1, '2026-01-12': 3,
          '2026-01-14': 1, '2026-01-19': 2, '2026-01-20': 1, '2026-01-22': 1,
          '2026-01-26': 2, '2026-01-31': 3
        });
        setTodaySchedule([
          { time: '09:00', duration: 60, serviceName: 'Strategy Consultation', clientName: 'Michael Chen', status: 'confirmed', type: 'booked' },
          { time: '10:30', duration: 90, serviceName: 'Executive Coaching', clientName: 'Sarah Williams', status: 'confirmed', type: 'booked' },
          { time: '12:00', duration: 60, serviceName: 'Available Slot', clientName: 'Open for booking', type: 'available' },
          { time: '14:00', duration: 180, serviceName: 'Team Workshop', clientName: 'Acme Corp Team', status: 'pending', type: 'booked' },
          { time: '17:30', duration: 60, serviceName: 'Strategy Consultation', clientName: 'James Peterson', status: 'confirmed', type: 'booked' }
        ]);
        setPayments([
          { id: 'TXN-78432', customerName: 'Michael Chen', customerInitials: 'MC', service: 'Strategy Consultation', date: '2026-01-31', amount: 150.00, status: 'completed' },
          { id: 'TXN-78431', customerName: 'Sarah Williams', customerInitials: 'SW', service: 'Executive Coaching', date: '2026-01-31', amount: 350.00, status: 'completed' },
          { id: 'TXN-78430', customerName: 'Acme Corp', customerInitials: 'AC', service: 'Team Workshop', date: '2026-01-30', amount: 450.00, status: 'pending' },
          { id: 'TXN-78429', customerName: 'James Peterson', customerInitials: 'JP', service: 'Process Audit', date: '2026-01-29', amount: 275.00, status: 'completed' },
          { id: 'TXN-78428', customerName: 'Emily Johnson', customerInitials: 'EJ', service: 'Strategy Consultation', date: '2026-01-28', amount: 150.00, status: 'refunded' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activePeriod, currentPage]);

  const handlePeriodChange = (period) => {
    setActivePeriod(period);
    showNotification(`Dashboard updated for ${period}`, 'success');
  };

  const handleNewBooking = () => {
    showNotification('Opening new booking form...', 'info');
  };

  const handleAddService = () => {
    showNotification('Opening service creation form...', 'info');
  };

  const handleEditService = (service) => {
    showNotification(`Editing: ${service.name}`, 'info');
  };

  const handleViewService = (service) => {
    showNotification(`Viewing: ${service.name}`, 'info');
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const statCards = [
    { ...stats.revenue, icon: 'DollarSign', delay: 0 },
    { ...stats.bookings, icon: 'Calendar', delay: 1 },
    { ...stats.users, icon: 'Users', delay: 2 },
    { ...stats.rating, icon: 'Star', delay: 3 }
  ];

  return (
    <div className="dashboard-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening with your business today.</p>
        </div>
        <div className="page-header-right">
          <div className="date-filter">
            {['today', 'week', 'month', 'year'].map((period) => (
              <button
                key={period}
                className={`filter-btn ${activePeriod === period ? 'active' : ''}`}
                onClick={() => handlePeriodChange(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleNewBooking}>
            <Icons.Plus />
            New Booking
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Service Listing */}
        <div className="card card-large">
          <div className="card-header">
            <div className="card-title-group">
              <h2 className="card-title">Service Listings</h2>
              <span className="card-subtitle">Manage your active services</span>
            </div>
            <div className="card-actions">
              <button className="filter-dropdown-btn">
                <Icons.Filter />
                Filter
              </button>
              <button className="btn btn-secondary" onClick={handleAddService}>
                <Icons.Plus />
                Add Service
              </button>
            </div>
          </div>
          <div className="card-body">
            <ServiceTable 
              services={services}
              onEdit={handleEditService}
              onView={handleViewService}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages || 6}
              totalItems={pagination.total || 24}
              itemsPerPage={4}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {/* Booking Calendar */}
        <BookingCalendar bookings={calendarBookings} />

        {/* Time Slots */}
        <TimeSlots schedule={todaySchedule} />

        {/* Payment History */}
        <PaymentHistory payments={payments} />
      </div>
    </div>
  );
};

export default Dashboard;
