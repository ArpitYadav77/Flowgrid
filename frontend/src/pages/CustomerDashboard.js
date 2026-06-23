import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { slotsAPI, razorpayAPI } from '../services/api';
import * as Icons from '../components/Icons';
import ChatBot from '../components/ChatBot';
import { io } from 'socket.io-client';
import '../styles/CustomerDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_SERVER_URL = API_BASE_URL.replace('/api', '');
const OTP_LENGTH = 6;

const CustomerDashboard = ({ activeView = 'dashboard', onViewChange }) => {
  const { user, updateProfile } = useAuth();
  const { showNotification, notifications, markAsRead, clearAll, deleteNotification } = useNotification();

  const [services, setServices] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [myPayments, setMyPayments] = useState([]);
  
  // Favorites persisted in LocalStorage per user
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(`flowgrid_favorites_${user?.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState(activeView);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Booking Flow States
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('checkout');
  const [qrCode, setQrCode] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [lastConfirmedBooking, setLastConfirmedBooking] = useState(null);

  // Settings State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar || '');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Help State
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Sync favorites to LocalStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`flowgrid_favorites_${user.id}`, JSON.stringify(favorites));
    }
  }, [favorites, user?.id]);

  // Sync prop changes
  useEffect(() => {
    setActiveTab(activeView);
    // Reset booking states when changing tabs
    if (activeView !== 'browse') {
      setSelectedService(null);
      setSelectedSlot(null);
      setBookingSuccess(false);
    }
  }, [activeView]);

  // Fetch initial services & user data
  useEffect(() => {
    fetchServices();
    fetchMyBookings();
    fetchMyPayments();
  }, []);

  // Fetch slots in real-time when service or date selection changes
  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  // WebSocket Connection for Concurrency / Real-Time Slot Locking
  useEffect(() => {
    if (!selectedService) return;

    console.log(`🔌 Initializing socket connection for service room: service:${selectedService.id}`);
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to WebSocket server');
      socket.emit('join:service', selectedService.id);
    });

    // Real-time listener: Slot was booked by another user
    socket.on('slot:booked', (data) => {
      console.log('📢 Real-time slot booked event received:', data);
      if (data.timeSlotId) {
        setAvailableSlots(prev => prev.filter(slot => slot.id !== data.timeSlotId));
        if (selectedSlot?.id === data.timeSlotId) {
          setSelectedSlot(null);
          showNotification('The selected slot was just booked by another user.', 'warning');
        }
      }
    });

    // Real-time listener: Slot was released / freed
    socket.on('slot:freed', (data) => {
      console.log('📢 Real-time slot freed event received:', data);
      fetchAvailableSlots();
    });

    socket.on('connect_error', (err) => {
      console.warn('🔌 WebSocket connection error:', err.message);
    });

    return () => {
      console.log('🔌 Cleaning up socket connection');
      socket.disconnect();
    };
  }, [selectedService, selectedDate, selectedSlot]);

  // Helper API calls
  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await slotsAPI.getServices({ status: 'active' });
      setServices(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      showNotification('Failed to load services', 'error');
    }
    setLoading(false);
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await slotsAPI.getAvailableSlots({
        date: selectedDate,
        providerId: selectedService.providerId,
        serviceId: selectedService.id
      });
      // Filter available slots
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setAvailableSlots([]);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await slotsAPI.getBookings();
      setMyBookings(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchMyPayments = async () => {
    try {
      const response = await razorpayAPI.getPayments();
      setMyPayments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  // Toggle favorites
  const toggleFavorite = (serviceId, e) => {
    e.stopPropagation();
    if (favorites.includes(serviceId)) {
      setFavorites(prev => prev.filter(id => id !== serviceId));
      showNotification('Removed from saved services', 'info');
    } else {
      setFavorites(prev => [...prev, serviceId]);
      showNotification('Added to saved services', 'success');
    }
  };

  const handleBookNowClick = (service, e) => {
    if (e) e.stopPropagation();
    setSelectedService(service);
    setSelectedSlot(null);
    setBookingSuccess(false);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    if (onViewChange) onViewChange('browse');
    setActiveTab('browse');
  };

  const handlePaymentMethodSelect = async (method) => {
    setPaymentMethod(method);
    setShowPaymentModal(false);
    if (method === 'qr') {
      await handleQrPayment();
    } else {
      await handleCheckoutPayment();
    }
  };

  const handleQrPayment = async () => {
    setBookingLoading(true);
    try {
      // 1. Reserve/Book the slot (locking in backend transaction)
      const bookingResponse = await slotsAPI.bookSlot({
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedSlot.time,
        providerId: selectedService.providerId
      });

      const booking = bookingResponse.data.booking || bookingResponse.data;
      setPendingBooking(booking);

      // 2. Generate Razorpay QR Code
      const qrResponse = await razorpayAPI.createQr({
        amount: selectedService.price,
        bookingId: booking.id,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        providerId: selectedService.providerId
      });

      setQrCode(qrResponse.data);
      showNotification('Scan the QR code to complete payment', 'info');
    } catch (error) {
      console.error('QR Payment Init Error:', error);
      if (error.response?.status === 409) {
        showNotification('This slot is already booked. Please choose another slot.', 'error');
        fetchAvailableSlots();
      } else {
        showNotification(error.response?.data?.error || 'Failed to initiate payment', 'error');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleQrPaymentComplete = async () => {
    if (!qrCode || !pendingBooking) return;
    setBookingLoading(true);
    try {
      const simulatedPayId = `pay_qr_sim_${Date.now()}`;
      
      // Verify QR payment
      await razorpayAPI.verifyQrPayment({
        qr_id: qrCode.qr_id,
        payment_id: simulatedPayId,
        bookingId: pendingBooking.id
      });

      // Confirm Booking
      const confirmResponse = await slotsAPI.confirmBooking(pendingBooking.id, {
        paymentId: simulatedPayId
      });

      const finalBooking = confirmResponse.data.booking || confirmResponse.data || pendingBooking;
      setLastConfirmedBooking(finalBooking);
      setBookingSuccess(true);

      showNotification('Payment successful! Booking confirmed.', 'success');
      setQrCode(null);
      setPendingBooking(null);
      
      // Refresh user lists
      fetchMyBookings();
      fetchMyPayments();
    } catch (error) {
      console.error('QR Payment Complete Error:', error);
      showNotification(error.response?.data?.error || 'Verification failed. Please try again.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelQrPayment = async () => {
    if (pendingBooking) {
      try {
        await slotsAPI.cancelBooking(pendingBooking.id, {
          reason: 'Payment cancelled by user'
        });
      } catch (error) {
        console.error('Failed to cancel slot lock:', error);
      }
    }
    setQrCode(null);
    setPendingBooking(null);
    showNotification('Payment cancelled', 'info');
  };

  const handleCheckoutPayment = async () => {
    setBookingLoading(true);
    try {
      // 1. Reserve/Book the slot (locking in backend transaction)
      const bookingResponse = await slotsAPI.bookSlot({
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedSlot.time,
        providerId: selectedService.providerId
      });

      const booking = bookingResponse.data.booking;

      // 2. Create Checkout Order
      const orderResponse = await razorpayAPI.createOrder({
        amount: selectedService.price,
        bookingId: booking.id,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        providerId: selectedService.providerId
      });

      const order = orderResponse.data;

      // 3. Initiate Checkout Modal
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'FlowGrid',
        description: `Booking for ${selectedService.name}`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            await razorpayAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id
            });

            const confirmResponse = await slotsAPI.confirmBooking(booking.id, {
              paymentId: response.razorpay_payment_id
            });

            setLastConfirmedBooking(confirmResponse.data.booking || booking);
            setBookingSuccess(true);
            showNotification('Booking confirmed successfully!', 'success');
            fetchMyBookings();
            fetchMyPayments();
          } catch (err) {
            showNotification('Payment verification failed.', 'error');
          }
        },
        prefill: order.prefill,
        theme: {
          color: '#0F3D3E'
        },
        modal: {
          ondismiss: async function() {
            try {
              await slotsAPI.cancelBooking(booking.id, {
                reason: 'Payment dismissed by user'
              });
              showNotification('Booking cancelled', 'info');
            } catch (err) {
              console.error('Failed to cancel slot lock:', err);
            }
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Checkout Payment Error:', error);
      if (error.response?.status === 409) {
        showNotification('This slot is already booked. Please choose another slot.', 'error');
        fetchAvailableSlots();
      } else {
        showNotification(error.response?.data?.error || 'Failed to book slot', 'error');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await slotsAPI.cancelBooking(bookingId, { reason: 'Cancelled by customer' });
      showNotification('Booking successfully cancelled.', 'success');
      fetchMyBookings();
      fetchMyPayments();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Failed to cancel booking', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const result = await updateProfile({
        name: profileName,
        phone: profilePhone,
        avatar: profileAvatar
      });
      if (result.success) {
        showNotification('Profile updated successfully!', 'success');
      } else {
        showNotification(result.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      showNotification('Failed to update profile', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSubmitted(true);
    setSupportMessage('');
    showNotification('Support request submitted successfully!', 'success');
  };

  // Helper date chip sliders builder
  const getNext7Days = () => {
    const dates = [];
    const today = new Date();
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const isToday = i === 0;
      dates.push({
        value: date.toISOString().split('T')[0],
        dayNum: date.getDate(),
        dayName: isToday ? 'Today' : weekdayNames[date.getDay()],
        monthName: date.toLocaleString('en-IN', { month: 'short' })
      });
    }
    return dates;
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'status-badge-premium created',
      confirmed: 'status-badge-premium captured',
      cancelled: 'status-badge-premium failed',
      completed: 'status-badge-premium captured'
    };
    return classes[status?.toLowerCase()] || 'status-badge-premium created';
  };

  const getFormattedDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMockNextSlotText = (serviceId) => {
    // Generate logical next slot dynamically for card display
    const hash = serviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const nextHour = (new Date().getHours() + (hash % 4) + 1) % 24;
    const isToday = hash % 2 === 0;
    const formattedHour = `${nextHour % 12 || 12}:00 ${nextHour >= 12 ? 'PM' : 'AM'}`;
    return isToday ? `Today, ${formattedHour}` : `Tomorrow, ${formattedHour}`;
  };

  // Services filtering
  const activeServices = services.filter(s => s.status === 'ACTIVE');
  const categories = ['all', ...new Set(activeServices.map(s => s.category))];
  const searchedServices = activeServices.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.providerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats Card Calculations
  const upcomingCount = myBookings.filter(b => b.status === 'CONFIRMED' && new Date(b.date) >= new Date().setHours(0,0,0,0)).length;
  const completedCount = myBookings.filter(b => b.status === 'COMPLETED').length;
  const availableServicesCount = activeServices.length;
  const savedCount = favorites.length;

  return (
    <div className="customer-dashboard-container">
      {/* 1. Header Section */}
      <div className="dashboard-header">
        <div className="header-title-section">
          <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p>Discover, book, and manage your local services instantly.</p>
        </div>
        {activeTab !== 'browse' && (
          <button className="header-cta-btn" onClick={() => { if (onViewChange) onViewChange('browse'); setActiveTab('browse'); }}>
            <Icons.Search size={18} />
            Discover Services
          </button>
        )}
      </div>

      {/* 2. Dashboard Card Stats (Rendered only on Dashboard view) */}
      {activeTab === 'dashboard' && (
        <div className="stats-cards-grid">
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { if (onViewChange) onViewChange('bookings'); setActiveTab('bookings'); }}>
            <div className="stat-card-left">
              <span className="stat-card-title">Upcoming Bookings</span>
              <span className="stat-card-value">{upcomingCount}</span>
              <span className="stat-card-detail">Active appointments</span>
            </div>
            <div className="stat-card-icon">
              <Icons.Calendar size={22} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-left">
              <span className="stat-card-title">Completed Bookings</span>
              <span className="stat-card-value">{completedCount}</span>
              <span className="stat-card-detail">Total services received</span>
            </div>
            <div className="stat-card-icon">
              <Icons.CheckCircle size={22} style={{ color: 'var(--success-color)' }} />
            </div>
          </div>

          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { if (onViewChange) onViewChange('browse'); setActiveTab('browse'); }}>
            <div className="stat-card-left">
              <span className="stat-card-title">Available Services</span>
              <span className="stat-card-value">{availableServicesCount}</span>
              <span className="stat-card-detail">Salons, tutors & wash</span>
            </div>
            <div className="stat-card-icon">
              <Icons.Package size={22} />
            </div>
          </div>

          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => { if (onViewChange) onViewChange('favorites'); setActiveTab('favorites'); }}>
            <div className="stat-card-left">
              <span className="stat-card-title">Saved Services</span>
              <span className="stat-card-value">{savedCount}</span>
              <span className="stat-card-detail">Favorited providers</span>
            </div>
            <div className="stat-card-icon">
              <Icons.Heart size={22} style={{ color: '#ef4444' }} />
            </div>
          </div>
        </div>
      )}

      {/* 3. Dashboard View Content */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-main-section">
          <div className="section-header">
            <h2>Available Services</h2>
            <button className="header-cta-btn" style={{ background: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }} onClick={() => { if (onViewChange) onViewChange('browse'); setActiveTab('browse'); }}>
              View All Services
            </button>
          </div>
          
          <div className="services-grid-redesign">
            {loading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                <Icons.Loader className="loading-spinner" />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading available services...</p>
              </div>
            ) : activeServices.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
                <Icons.Search size={40} style={{ color: 'var(--text-muted)' }} />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No active services found in the database.</p>
              </div>
            ) : (
              activeServices.slice(0, 4).map(service => {
                const isFavorite = favorites.includes(service.id);
                return (
                  <div key={service.id} className="premium-service-card" onClick={(e) => handleBookNowClick(service, e)}>
                    <div className="service-card-image-wrapper">
                      <img src={service.imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'} alt={service.name} className="service-card-img" />
                      <span className="service-card-badge">{service.category}</span>
                      <button className={`service-card-favorite-btn ${isFavorite ? 'is-favorite' : ''}`} onClick={(e) => toggleFavorite(service.id, e)}>
                        <Icons.Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} />
                      </button>
                    </div>
                    <div className="service-card-body">
                      <span className="service-card-provider">{service.providerName || 'FlowGrid Partner'}</span>
                      <h3 className="service-card-name">{service.name}</h3>
                      <div className="service-card-rating">
                        <Icons.Star size={14} />
                        <span>{service.rating > 0 ? service.rating.toFixed(1) : '4.5'}</span>
                        <span className="service-card-rating-count">({service.reviewsCount || 12} reviews)</span>
                      </div>
                      <p className="service-card-description">{service.description || 'Professional scheduling and quality real-world service delivery.'}</p>
                      
                      <span className="service-card-next-slot">
                        Next: {getMockNextSlotText(service.id)}
                      </span>
                      
                      <div className="service-card-footer">
                        <div className="service-card-price-info">
                          <span className="service-card-duration">
                            <Icons.Clock size={12} />
                            {service.duration} mins
                          </span>
                          <span className="service-card-price">₹{service.price}</span>
                        </div>
                        <button className="service-card-book-btn" onClick={(e) => handleBookNowClick(service, e)}>
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Browse Services / Booking Flow View */}
      {activeTab === 'browse' && (
        <div className="browse-services-flow-view">
          {!selectedService ? (
            // Service List
            <>
              <div className="section-header">
                <h2>Browse Services</h2>
                <div className="search-filter-bar">
                  <div className="search-input-wrapper">
                    <Icons.Search size={16} className="search-icon-inside" />
                    <input type="text" placeholder="Search service or provider..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <select className="category-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="services-grid-redesign">
                {loading ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                    <Icons.Loader className="loading-spinner" />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading services...</p>
                  </div>
                ) : searchedServices.length === 0 ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
                    <Icons.Search size={40} style={{ color: 'var(--text-muted)' }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No matching services found.</p>
                  </div>
                ) : (
                  searchedServices.map(service => {
                    const isFavorite = favorites.includes(service.id);
                    return (
                      <div key={service.id} className="premium-service-card" onClick={(e) => handleBookNowClick(service, e)}>
                        <div className="service-card-image-wrapper">
                          <img src={service.imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'} alt={service.name} className="service-card-img" />
                          <span className="service-card-badge">{service.category}</span>
                          <button className={`service-card-favorite-btn ${isFavorite ? 'is-favorite' : ''}`} onClick={(e) => toggleFavorite(service.id, e)}>
                            <Icons.Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} />
                          </button>
                        </div>
                        <div className="service-card-body">
                          <span className="service-card-provider">{service.providerName || 'FlowGrid Partner'}</span>
                          <h3 className="service-card-name">{service.name}</h3>
                          <div className="service-card-rating">
                            <Icons.Star size={14} />
                            <span>{service.rating > 0 ? service.rating.toFixed(1) : '4.5'}</span>
                            <span className="service-card-rating-count">({service.reviewsCount || 12} reviews)</span>
                          </div>
                          <p className="service-card-description">{service.description || 'Professional scheduling and quality real-world service delivery.'}</p>
                          
                          <span className="service-card-next-slot">
                            Next: {getMockNextSlotText(service.id)}
                          </span>

                          <div className="service-card-footer">
                            <div className="service-card-price-info">
                              <span className="service-card-duration">
                                <Icons.Clock size={12} />
                                {service.duration} mins
                              </span>
                              <span className="service-card-price">₹{service.price}</span>
                            </div>
                            <button className="service-card-book-btn" onClick={(e) => handleBookNowClick(service, e)}>
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : bookingSuccess ? (
            // Booking Success Page
            <div className="booking-success-wrapper">
              <div className="success-icon-container">
                <Icons.Check />
              </div>
              <h2 className="success-title">Booking Confirmed!</h2>
              <p className="success-desc">Your payment was verified successfully. A confirmation email has been logged to your inbox.</p>
              
              <div className="success-detail-box">
                <div className="success-detail-row">
                  <span className="success-detail-label">Service</span>
                  <span className="success-detail-val">{selectedService.name}</span>
                </div>
                <div className="success-detail-row">
                  <span className="success-detail-label">Provider</span>
                  <span className="success-detail-val">{selectedService.providerName}</span>
                </div>
                <div className="success-detail-row">
                  <span className="success-detail-label">Date</span>
                  <span className="success-detail-val">{getFormattedDate(selectedDate)}</span>
                </div>
                <div className="success-detail-row">
                  <span className="success-detail-label">Time</span>
                  <span className="success-detail-val">{selectedSlot?.time}</span>
                </div>
                <div className="success-detail-row">
                  <span className="success-detail-label">Amount Paid</span>
                  <span className="success-detail-val">₹{selectedService.price}</span>
                </div>
                {lastConfirmedBooking?.id && (
                  <div className="success-detail-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <span className="success-detail-label">Booking ID</span>
                    <span className="success-detail-val" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{lastConfirmedBooking.id}</span>
                  </div>
                )}
              </div>

              <div className="success-actions">
                <button className="header-cta-btn" style={{ background: '#f1f5f9', color: 'var(--text-main)' }} onClick={() => { setSelectedService(null); setBookingSuccess(false); }}>
                  Book Another Service
                </button>
                <button className="header-cta-btn" onClick={() => { setSelectedService(null); setBookingSuccess(false); if (onViewChange) onViewChange('bookings'); setActiveTab('bookings'); }}>
                  View My Bookings
                </button>
              </div>
            </div>
          ) : (
            // Split Calendar / Slots booking screen
            <div className="booking-flow-split">
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }} onClick={() => setSelectedService(null)}>
                  <Icons.ArrowLeft size={20} />
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Back to listing</span>
              </div>

              <div className="booking-flow-container">
                {/* Left Side: Onboarding calendar selection */}
                <div className="booking-flow-left">
                  <h3 className="flow-step-title">1. Choose Appointment Date</h3>
                  <div className="calendar-date-slider">
                    {getNext7Days().map(date => {
                      const isSelected = selectedDate === date.value;
                      return (
                        <div key={date.value} className={`calendar-date-chip ${isSelected ? 'selected' : ''}`} onClick={() => { setSelectedDate(date.value); setSelectedSlot(null); }}>
                          <span className="date-chip-dayname">{date.dayName}</span>
                          <span className="date-chip-daynum">{date.dayNum}</span>
                          <span className="date-chip-dayname" style={{ fontSize: '0.65rem' }}>{date.monthName}</span>
                        </div>
                      );
                    })}
                  </div>

                  <h3 className="flow-step-title" style={{ marginTop: '2rem' }}>2. Select Available Slot</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
                    🟢 Availability updates in real-time using secure slot concurrency.
                  </p>

                  {availableSlots.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: 10, marginTop: '1rem', border: '1px dashed var(--border-color)' }}>
                      <Icons.Calendar size={32} style={{ color: 'var(--text-muted)' }} />
                      <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>No slots available for {getFormattedDate(selectedDate)}.</p>
                    </div>
                  ) : (
                    <div className="time-slots-grid-redesign">
                      {availableSlots.map(slot => {
                        const isSelected = selectedSlot?.id === slot.id;
                        const isLocked = slot.status === 'LOCKED' && slot.lockedBy !== user?.id;
                        return (
                          <button key={slot.id} className={`time-slot-btn-redesign ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`} disabled={isLocked} onClick={() => setSelectedSlot(slot)}>
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Side: Onboarding Summary & Payment triggers */}
                <div className="booking-flow-right">
                  <div className="summary-card">
                    <h3 className="flow-step-title">Booking Summary</h3>
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                      <img src={selectedService.imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=120&q=80'} alt={selectedService.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{selectedService.category}</span>
                        <h4 style={{ margin: '0.1rem 0', fontWeight: 700, fontSize: '1rem' }}>{selectedService.name}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedService.providerName}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                        <span style={{ fontWeight: 600 }}>{selectedService.duration} mins</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Date</span>
                        <span style={{ fontWeight: 600 }}>{getFormattedDate(selectedDate)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Time Slot</span>
                        <span style={{ fontWeight: 600, color: selectedSlot ? 'var(--text-main)' : 'var(--error-color)' }}>
                          {selectedSlot ? selectedSlot.time : 'Not Selected'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Total Price</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>₹{selectedService.price}</span>
                    </div>

                    <button className="header-cta-btn" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }} disabled={!selectedSlot || bookingLoading} onClick={() => setShowPaymentModal(true)}>
                      {bookingLoading ? (
                        <>
                          <Icons.Loader className="btn-loader" />
                          Processing Booking...
                        </>
                      ) : (
                        <>
                          <Icons.CreditCard size={18} />
                          Confirm & Pay ₹{selectedService.price}
                        </>
                      )}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <Icons.Shield size={12} /> Secure payments via Razorpay Sandbox
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. My Bookings View */}
      {activeTab === 'bookings' && (
        <div className="bookings-view-tab">
          <div className="section-header">
            <h2>My Bookings</h2>
          </div>

          {myBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 12 }}>
              <Icons.Calendar size={48} style={{ color: 'var(--text-muted)' }} />
              <h3 style={{ marginTop: '1.5rem', fontWeight: 700 }}>No bookings scheduled</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem 0', fontSize: '0.9rem' }}>You don't have any upcoming or past bookings at the moment.</p>
              <button className="header-cta-btn" style={{ margin: '0 auto' }} onClick={() => { if (onViewChange) onViewChange('browse'); setActiveTab('browse'); }}>
                Browse Services
              </button>
            </div>
          ) : (
            <div className="bookings-list-redesign">
              {myBookings.map(booking => {
                const bookingDate = new Date(booking.date);
                const day = bookingDate.getDate();
                const month = bookingDate.toLocaleString('en-IN', { month: 'short' });
                
                const isCancellable = booking.status === 'PENDING' || 
                                     (booking.status === 'CONFIRMED' && bookingDate >= new Date().setHours(0,0,0,0));
                
                return (
                  <div key={booking.id} className="booking-card-redesign">
                    <div className="booking-card-left">
                      <div className="booking-card-calendar-box">
                        <span className="calendar-box-month">{month}</span>
                        <span className="calendar-box-day">{day}</span>
                      </div>
                      <div className="booking-card-details">
                        <h4>{booking.serviceName}</h4>
                        <p className="booking-card-provider">{booking.providerName || 'FlowGrid Partner'}</p>
                        <div className="booking-card-meta">
                          <span>
                            <Icons.Clock size={12} /> {booking.time || booking.startTime}
                          </span>
                          <span>
                            <Icons.DollarSign size={12} style={{ marginRight: '-2px' }} /> ₹{booking.price}
                          </span>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                            ID: #{booking.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="booking-card-actions">
                      <span className={getStatusBadgeClass(booking.status)}>
                        {booking.status === 'pending' ? 'Pending Payment' : booking.status}
                      </span>
                      {isCancellable && (
                        <button className="header-cta-btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.775rem', background: 'transparent', border: '1px solid var(--error-color)', color: 'var(--error-color)' }} onClick={() => handleCancelBooking(booking.id)}>
                          Cancel Appointment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Favorites View */}
      {activeTab === 'favorites' && (
        <div className="favorites-view-tab">
          <div className="section-header">
            <h2>Your Favorites</h2>
          </div>

          {favorites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 12 }}>
              <Icons.Heart size={48} style={{ color: 'var(--text-muted)' }} />
              <h3 style={{ marginTop: '1.5rem', fontWeight: 700 }}>Your favorites list is empty</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem 0', fontSize: '0.9rem' }}>Save services you love so you can book them again quickly.</p>
              <button className="header-cta-btn" style={{ margin: '0 auto' }} onClick={() => { if (onViewChange) onViewChange('browse'); setActiveTab('browse'); }}>
                Browse Services
              </button>
            </div>
          ) : (
            <div className="services-grid-redesign">
              {activeServices.filter(s => favorites.includes(s.id)).map(service => {
                return (
                  <div key={service.id} className="premium-service-card" onClick={(e) => handleBookNowClick(service, e)}>
                    <div className="service-card-image-wrapper">
                      <img src={service.imageUrl || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80'} alt={service.name} className="service-card-img" />
                      <span className="service-card-badge">{service.category}</span>
                      <button className="service-card-favorite-btn is-favorite" onClick={(e) => toggleFavorite(service.id, e)}>
                        <Icons.Heart size={16} fill="#ef4444" />
                      </button>
                    </div>
                    <div className="service-card-body">
                      <span className="service-card-provider">{service.providerName || 'FlowGrid Partner'}</span>
                      <h3 className="service-card-name">{service.name}</h3>
                      <div className="service-card-rating">
                        <Icons.Star size={14} />
                        <span>{service.rating > 0 ? service.rating.toFixed(1) : '4.5'}</span>
                        <span className="service-card-rating-count">({service.reviewsCount || 12} reviews)</span>
                      </div>
                      <p className="service-card-description">{service.description || 'Professional scheduling and quality real-world service delivery.'}</p>
                      
                      <span className="service-card-next-slot">
                        Next: {getMockNextSlotText(service.id)}
                      </span>

                      <div className="service-card-footer">
                        <div className="service-card-price-info">
                          <span className="service-card-duration">
                            <Icons.Clock size={12} />
                            {service.duration} mins
                          </span>
                          <span className="service-card-price">₹{service.price}</span>
                        </div>
                        <button className="service-card-book-btn" onClick={(e) => handleBookNowClick(service, e)}>
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Payment History View */}
      {activeTab === 'payments' && (
        <div className="payments-view-tab">
          <div className="section-header">
            <h2>Payment History</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All transactions logs verified by Razorpay API.</p>
          </div>

          {myPayments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 12 }}>
              <Icons.CreditCard size={48} style={{ color: 'var(--text-muted)' }} />
              <h3 style={{ marginTop: '1.5rem', fontWeight: 700 }}>No payments completed</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0', fontSize: '0.9rem' }}>You haven't made any transactions yet.</p>
            </div>
          ) : (
            <div className="payments-table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myPayments.map(payment => (
                    <tr key={payment.id}>
                      <td style={{ fontWeight: 600 }}>#{payment.id.slice(0, 10).toUpperCase()}</td>
                      <td>{payment.serviceName || 'Booking Reservation'}</td>
                      <td>{getFormattedDate(payment.createdAt)}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase' }}>
                          {payment.method || 'Razorpay'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>₹{payment.amount}</td>
                      <td>
                        <span className={`status-badge-premium ${payment.status?.toLowerCase()}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 8. Notifications View */}
      {activeTab === 'notifications' && (
        <div className="notifications-view-tab">
          <div className="section-header">
            <h2>Notifications</h2>
            {notifications.length > 0 && (
              <button className="header-cta-btn" style={{ background: 'transparent', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }} onClick={clearAll}>
                Clear All
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 12 }}>
              <Icons.Bell size={48} style={{ color: 'var(--text-muted)' }} />
              <h3 style={{ marginTop: '1.5rem', fontWeight: 700 }}>All caught up!</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0', fontSize: '0.9rem' }}>You don't have any notifications at the moment.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map(n => (
                <div key={n.id} className={`notification-item-premium ${!n.read ? 'unread' : ''}`}>
                  <div className="notification-icon-wrapper">
                    {n.icon === 'Calendar' ? <Icons.Calendar size={18} /> : 
                     n.icon === 'CreditCard' ? <Icons.CreditCard size={18} /> : 
                     n.icon === 'TrendingUp' ? <Icons.TrendingUp size={18} /> : 
                     <Icons.Bell size={18} />}
                  </div>
                  <div className="notification-content-wrapper">
                    <div className="notification-title-row">
                      <h4 className="notification-item-title">{n.title}</h4>
                      <span className="notification-item-time">{new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="notification-item-msg">{n.message}</p>
                    {!n.read && (
                      <div className="notification-item-actions">
                        <button className="notification-action-link" onClick={() => markAsRead(n.id)}>Mark as read</button>
                      </div>
                    )}
                  </div>
                  <button className="notification-delete-btn" onClick={() => deleteNotification(n.id)}>
                    <Icons.Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. Settings View */}
      {activeTab === 'settings' && (
        <div className="settings-view-tab">
          <div className="section-header">
            <h2>Account Settings</h2>
          </div>
          <div className="settings-form-layout">
            <form onSubmit={handleSaveProfile} className="form-grid-redesign">
              <div className="form-group-redesign">
                <label>Full Name</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required placeholder="Your full name" />
              </div>
              <div className="form-group-redesign">
                <label>Email Address</label>
                <input type="email" value={user?.email || ''} disabled style={{ backgroundColor: '#f8fafc', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              </div>
              <div className="form-group-redesign">
                <label>Phone Number</label>
                <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="Your phone number" />
              </div>
              <div className="form-group-redesign">
                <label>Avatar URL</label>
                <input type="text" value={profileAvatar} onChange={(e) => setProfileAvatar(e.target.value)} placeholder="https://image-url..." />
              </div>
              <button className="header-cta-btn" style={{ marginTop: '1rem', width: 'fit-content' }} type="submit" disabled={settingsSaving}>
                {settingsSaving ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 10. Help Center View */}
      {activeTab === 'help' && (
        <div className="help-view-tab">
          <div className="section-header">
            <h2>Help & Support Center</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 12, padding: '2rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Frequently Asked Questions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>1. How do I book an appointment?</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Simply browse available services, select your preferred date, pick a free slot, and complete the sandbox Razorpay payment.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>2. Can I cancel a booking?</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Yes, appointments can be cancelled up to 2 hours before the start time. Navigate to 'My Bookings' and click 'Cancel Appointment'.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.35rem 0' }}>3. How does the real-time locking work?</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>When you click a slot, it reserves it for 5 minutes. If another user attempts to book the same slot, the system's transaction locks block them to avoid double booking.</p>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 12, padding: '2rem' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Contact Support</h3>
              {supportSubmitted ? (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <Icons.CheckCircle size={32} style={{ color: 'var(--success-color)' }} />
                  <h4 style={{ fontWeight: 700, marginTop: '1rem' }}>Message Submitted!</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>We have received your support request and will reply within 24 hours.</p>
                  <button className="header-cta-btn" style={{ margin: '1rem auto 0 auto', background: '#f1f5f9', color: 'var(--text-main)' }} onClick={() => setSupportSubmitted(false)}>
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="form-grid-redesign">
                  <div className="form-group-redesign">
                    <label>How can we help you?</label>
                    <textarea rows="4" value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} required placeholder="Describe your question or issue in detail..." style={{ padding: '0.625rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
                  </div>
                  <button className="header-cta-btn" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 11. Choose Payment Method Modal */}
      {showPaymentModal && (
        <div className="modal-overlay-redesign" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-redesign" onClick={e => e.stopPropagation()}>
            <div className="modal-header-redesign">
              <h3>Choose Payment Method</h3>
              <button className="modal-close-btn-redesign" onClick={() => setShowPaymentModal(false)}>
                <Icons.X size={18} />
              </button>
            </div>
            <div className="modal-body-redesign" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="header-cta-btn" style={{ background: '#f8fafc', color: 'var(--text-main)', border: '1px solid var(--border-color)', justifyContent: 'flex-start', padding: '1rem', width: '100%' }} onClick={() => handlePaymentMethodSelect('qr')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
                  <Icons.Grid size={22} style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Simulated UPI QR Code</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scan & pay instantly using sandbox mode</p>
                  </div>
                </div>
              </button>

              <button className="header-cta-btn" style={{ background: '#f8fafc', color: 'var(--text-main)', border: '1px solid var(--border-color)', justifyContent: 'flex-start', padding: '1rem', width: '100%' }} onClick={() => handlePaymentMethodSelect('checkout')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}>
                  <Icons.CreditCard size={22} style={{ color: 'var(--primary-color)' }} />
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Standard Razorpay Checkout</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pay using card, netbanking, or UPI wallet</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. QR Code Scanner Simulation Modal */}
      {qrCode && (
        <div className="modal-overlay-redesign">
          <div className="modal-redesign" style={{ maxWidth: '500px' }}>
            <div className="modal-header-redesign">
              <h3>Scan QR code to pay</h3>
              <button className="modal-close-btn-redesign" onClick={handleCancelQrPayment}>
                <Icons.X size={18} />
              </button>
            </div>
            <div className="modal-body-redesign" style={{ textAlign: 'center' }}>
              <div style={{ margin: '0 auto 1rem auto', padding: '0.5rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 12, width: 'fit-content' }}>
                <img src={qrCode.image_url} alt="Scan to pay" style={{ width: '180px', height: '180px', display: 'block' }} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)', margin: '0 0 0.25rem 0' }}>₹{selectedService?.price}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>Booking for: {selectedService?.name}</p>
              
              <div style={{ textAlign: 'left', background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: 'var(--text-main)' }}>💡 Test Mode Simulator:</p>
                <p style={{ margin: '0 0 0.25rem 0' }}>1. Since this is in development, real UPI apps will not complete payment.</p>
                <p style={{ margin: 0 }}>2. Click the **"Simulate Successful Payment"** button below to mock successful Razorpay callback transaction.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border-color)', background: '#f8fafc', justifyContent: 'flex-end' }}>
              <button className="header-cta-btn" style={{ background: 'white', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} onClick={handleCancelQrPayment} disabled={bookingLoading}>
                Cancel
              </button>
              <button className="header-cta-btn" onClick={handleQrPaymentComplete} disabled={bookingLoading}>
                {bookingLoading ? 'Verifying...' : 'Simulate Successful Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Chatbot Assistant */}
      <ChatBot onBookingComplete={(details) => {
        if (details && details.services && details.services.length > 0) {
          const service = details.services[0];
          setSelectedService(service);
          setSelectedDate(details.date);
          setSelectedSlot({ time: details.time, available: true });
          setShowPaymentModal(true);
        }
      }} />
    </div>
  );
};

export default CustomerDashboard;
