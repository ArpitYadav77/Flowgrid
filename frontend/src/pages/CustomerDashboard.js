import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { slotsAPI, razorpayAPI } from '../services/api';
import * as Icons from '../components/Icons';

const CustomerDashboard = ({ activeView = 'browse' }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [myPayments, setMyPayments] = useState([]);
  const [activeTab, setActiveTab] = useState(activeView);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('checkout'); // 'checkout' or 'qr'
  const [qrCode, setQrCode] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);

  // Update active tab when activeView prop changes
  useEffect(() => {
    setActiveTab(activeView);
  }, [activeView]);

  // Fetch services
  useEffect(() => {
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

    fetchServices();
  }, []);

  // Fetch available slots when service and date change
  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedService, selectedDate]);

  // Fetch user's bookings
  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchMyBookings();
    } else if (activeTab === 'payments') {
      fetchMyPayments();
    }
  }, [activeTab]);

  const fetchAvailableSlots = async () => {
    try {
      const response = await slotsAPI.getAvailableSlots({
        date: selectedDate,
        providerId: selectedService.providerId,
        serviceId: selectedService.id
      });
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
      showNotification('Failed to load payment history', 'error');
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setSelectedSlot(null);
    setAvailableSlots([]);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleBookAndPay = async () => {
    if (!selectedService || !selectedSlot) return;
    setShowPaymentModal(true);
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
      // Step 1: Book the slot
      console.log('Attempting to book slot...', {
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedSlot.time,
        providerId: selectedService.providerId
      });

      const bookingResponse = await slotsAPI.bookSlot({
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedSlot.time,
        providerId: selectedService.providerId
      });

      console.log('Booking response:', bookingResponse.data);

      const booking = bookingResponse.data.booking || bookingResponse.data;
      setPendingBooking(booking);

      // Step 2: Generate QR code
      console.log('Generating QR code for booking:', booking.id);
      
      const qrResponse = await razorpayAPI.createQr({
        amount: selectedService.price,
        bookingId: booking.id,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        providerId: selectedService.providerId
      });

      console.log('QR code generated:', qrResponse.data);

      setQrCode(qrResponse.data);
      showNotification('Scan QR code to complete payment', 'info');
      setBookingLoading(false);
    } catch (error) {
      console.error('QR payment error:', error);
      console.error('Error response:', error.response?.data);
      
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to generate QR code';
      
      // If booking fails with 409 (already booked), show specific message
      if (error.response?.status === 409) {
        showNotification('This slot is already booked. Please select another time slot.', 'error');
        // Reset selection
        setSelectedSlot(null);
        // Refresh slots
        if (selectedService && selectedDate) {
          try {
            const response = await slotsAPI.getAvailableSlots({
              date: selectedDate,
              providerId: selectedService.providerId,
              serviceId: selectedService.id
            });
            setAvailableSlots(response.data.slots || []);
          } catch (e) {
            console.error('Failed to refresh slots:', e);
          }
        }
      } else {
        showNotification(message, 'error');
      }
      
      setBookingLoading(false);
    }
  };

  const handleQrPaymentComplete = async () => {
    if (!qrCode || !pendingBooking) return;

    setBookingLoading(true);
    try {
      // For test mode, simulate payment completion
      const testPaymentId = `pay_qr_${Date.now()}`;
      
      console.log('Starting QR payment verification...', {
        qr_id: qrCode.qr_id,
        payment_id: testPaymentId,
        bookingId: pendingBooking.id
      });

      // Verify payment
      const verifyResponse = await razorpayAPI.verifyQrPayment({
        qr_id: qrCode.qr_id,
        payment_id: testPaymentId,
        bookingId: pendingBooking.id
      });

      console.log('Payment verified:', verifyResponse);

      // Confirm booking
      const confirmResponse = await slotsAPI.confirmBooking(pendingBooking.id, {
        paymentId: testPaymentId
      });

      console.log('Booking confirmed:', confirmResponse);

      showNotification('✅ Payment successful! Booking confirmed.', 'success');
      
      // Reset states
      setQrCode(null);
      setPendingBooking(null);
      setSelectedService(null);
      setSelectedSlot(null);
      
      // Refresh data
      fetchMyBookings();
      fetchMyPayments();
      
      // Switch to bookings tab
      setTimeout(() => {
        setActiveTab('bookings');
      }, 500);
      
    } catch (error) {
      console.error('Payment verification error:', error);
      console.error('Error details:', error.response?.data);
      showNotification(error.response?.data?.error || 'Payment verification failed. Please try again.', 'error');
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
        console.error('Failed to cancel booking:', error);
      }
    }
    setQrCode(null);
    setPendingBooking(null);
    setBookingLoading(false);
    showNotification('Payment cancelled', 'info');
  };

  const handleCheckoutPayment = async () => {
    setBookingLoading(true);
    try {
      // Step 1: Book the slot
      const bookingResponse = await slotsAPI.bookSlot({
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedSlot.time,
        providerId: selectedService.providerId
      });

      const booking = bookingResponse.data.booking;
      showNotification('Slot reserved! Proceeding to payment...', 'success');

      // Step 2: Create Razorpay order
      const orderResponse = await razorpayAPI.createOrder({
        amount: selectedService.price,
        bookingId: booking.id,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        providerId: selectedService.providerId
      });

      const order = orderResponse.data;

      // Step 3: Open Razorpay Checkout
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'FlowGrid',
        description: `Payment for ${selectedService.name}`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            // Step 4: Verify payment
            await razorpayAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id
            });

            // Step 5: Confirm booking
            await slotsAPI.confirmBooking(booking.id, {
              paymentId: response.razorpay_payment_id
            });

            showNotification('Booking confirmed! Payment successful.', 'success');
            
            // Reset selection and refresh
            setSelectedService(null);
            setSelectedSlot(null);
            setActiveTab('bookings');
            fetchMyBookings();
          } catch (error) {
            showNotification('Payment verification failed', 'error');
          }
        },
        prefill: order.prefill,
        theme: {
          color: '#2F6F64'
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [
                  {
                    method: "upi"
                  }
                ]
              },
              card: {
                name: "Cards",
                instruments: [
                  {
                    method: "card"
                  }
                ]
              },
              netbanking: {
                name: "Netbanking",
                instruments: [
                  {
                    method: "netbanking"
                  }
                ]
              },
              wallet: {
                name: "Wallet",
                instruments: [
                  {
                    method: "wallet"
                  }
                ]
              }
            },
            sequence: ["block.upi", "block.card", "block.netbanking", "block.wallet"],
            preferences: {
              show_default_blocks: false
            }
          }
        },
        modal: {
          ondismiss: async function() {
            // Cancel the pending booking if payment is dismissed
            try {
              await slotsAPI.cancelBooking(booking.id, {
                reason: 'Payment cancelled by user'
              });
              showNotification('Booking cancelled', 'info');
            } catch (error) {
              console.error('Failed to cancel booking:', error);
            }
          }
        }
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Booking failed';
      showNotification(message, 'error');
    }
    setBookingLoading(false);
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      await slotsAPI.cancelBooking(bookingId, { reason: 'Cancelled by customer' });
      showNotification('Booking cancelled', 'success');
      fetchMyBookings();
    } catch (error) {
      showNotification('Failed to cancel booking', 'error');
    }
  };

  const categories = ['all', ...new Set(services.map(s => s.category))];
  const filteredServices = categoryFilter === 'all' 
    ? services 
    : services.filter(s => s.category === categoryFilter);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', text: 'Pending Payment' },
      confirmed: { class: 'badge-success', text: 'Confirmed' },
      cancelled: { class: 'badge-error', text: 'Cancelled' },
      completed: { class: 'badge-info', text: 'Completed' }
    };
    return badges[status] || { class: '', text: status };
  };

  // Get next 7 days for date selection
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : formatDate(date)
      });
    }
    return dates;
  };

  return (
    <div className="dashboard-content customer-dashboard">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="page-subtitle">Find and book services from local providers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <Icons.Search />
          Browse Services
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <Icons.Calendar />
          My Bookings
          {myBookings.filter(b => b.status === 'confirmed').length > 0 && (
            <span className="tab-badge">{myBookings.filter(b => b.status === 'confirmed').length}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <Icons.CreditCard />
          Payment History
        </button>
      </div>

      {/* Browse Services Tab */}
      {activeTab === 'browse' && (
        <div className="browse-services">
          <div className="services-layout">
            {/* Services List */}
            <div className="services-panel">
              <div className="panel-header">
                <h2 className="panel-title">Available Services</h2>
                <div className="category-filter">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`filter-chip ${categoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="services-grid">
                {loading ? (
                  <div className="loading-state">
                    <Icons.Loader className="loading-spinner" />
                    <p>Loading services...</p>
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Search />
                    <p>No services available</p>
                  </div>
                ) : (
                  filteredServices.map(service => (
                    <div 
                      key={service.id}
                      className={`service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <div className="service-card-header">
                        <div className="service-category-badge">{service.category}</div>
                        {service.rating > 0 && (
                          <div className="service-rating">
                            <Icons.Star />
                            <span>{service.rating}</span>
                          </div>
                        )}
                      </div>
                      <h3 className="service-name">{service.name}</h3>
                      <p className="service-provider">{service.providerName}</p>
                      <p className="service-description">{service.description}</p>
                      <div className="service-meta">
                        <span className="service-duration">
                          <Icons.Clock />
                          {service.duration} min
                        </span>
                        <span className="service-price">₹{service.price}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Booking Panel */}
            <div className="booking-panel">
              {selectedService ? (
                <>
                  <div className="panel-header">
                    <h2 className="panel-title">Book Appointment</h2>
                  </div>

                  <div className="booking-summary">
                    <div className="booking-service-info">
                      <h3>{selectedService.name}</h3>
                      <p>{selectedService.providerName}</p>
                      <div className="booking-details">
                        <span><Icons.Clock /> {selectedService.duration} min</span>
                        <span><Icons.DollarSign /> ₹{selectedService.price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="booking-section">
                    <label className="booking-label">Select Date</label>
                    <div className="date-picker-grid">
                      {getDateOptions().map(date => (
                        <button
                          key={date.value}
                          className={`date-option ${selectedDate === date.value ? 'selected' : ''}`}
                          onClick={() => setSelectedDate(date.value)}
                        >
                          {date.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div className="booking-section">
                    <label className="booking-label">Select Time</label>
                    {availableSlots.length === 0 ? (
                      <div className="no-slots">
                        <Icons.Calendar />
                        <p>No slots available for this date</p>
                      </div>
                    ) : (
                      <div className="time-slots-grid">
                        {availableSlots.map(slot => (
                          <button
                            key={slot.id}
                            className={`time-slot ${selectedSlot?.id === slot.id ? 'selected' : ''}`}
                            onClick={() => handleSlotSelect(slot)}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Book Button */}
                  {selectedSlot && (
                    <div className="booking-action">
                      <div className="booking-total">
                        <span>Total</span>
                        <span className="total-amount">₹{selectedService.price}</span>
                      </div>
                      <button 
                        className="btn btn-primary btn-lg btn-full"
                        onClick={handleBookAndPay}
                        disabled={bookingLoading}
                      >
                        {bookingLoading ? (
                          <>
                            <Icons.Loader className="btn-loader" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icons.CreditCard />
                            Book & Pay ₹{selectedService.price}
                          </>
                        )}
                      </button>
                      <p className="booking-note">
                        <Icons.Shield />
                        Secure payment powered by Razorpay
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-booking-panel">
                  <Icons.Calendar />
                  <h3>Select a Service</h3>
                  <p>Choose a service from the list to book an appointment</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="my-bookings">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Your Bookings</h2>
            </div>
            <div className="card-body">
              {myBookings.length === 0 ? (
                <div className="empty-state">
                  <Icons.Calendar />
                  <h3>No bookings yet</h3>
                  <p>Start by browsing available services</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setActiveTab('browse')}
                  >
                    Browse Services
                  </button>
                </div>
              ) : (
                <div className="bookings-list">
                  {myBookings.map(booking => (
                    <div key={booking.id} className="booking-item">
                      <div className="booking-item-main">
                        <div className="booking-item-icon">
                          <Icons.Calendar />
                        </div>
                        <div className="booking-item-info">
                          <h4>{booking.serviceName}</h4>
                          <p className="booking-provider">{booking.providerName}</p>
                          <div className="booking-item-meta">
                            <span>
                              <Icons.Calendar />
                              {formatDate(booking.date)}
                            </span>
                            <span>
                              <Icons.Clock />
                              {booking.time}
                            </span>
                            <span>
                              <Icons.DollarSign />
                              ₹{booking.price}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="booking-item-actions">
                        <span className={`badge ${getStatusBadge(booking.status).class}`}>
                          {getStatusBadge(booking.status).text}
                        </span>
                        {booking.status === 'pending' && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment History Tab */}
      {activeTab === 'payments' && (
        <div className="payment-history">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Payment History</h2>
              <p className="card-subtitle">All transactions through Razorpay</p>
            </div>
            <div className="card-body">
              {myPayments.length === 0 ? (
                <div className="empty-state">
                  <Icons.CreditCard />
                  <h3>No payments yet</h3>
                  <p>Your payment history will appear here</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
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
                      {myPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            <span className="transaction-id">#{payment.id}</span>
                          </td>
                          <td>{payment.serviceName}</td>
                          <td>{formatDate(payment.date)}</td>
                          <td>
                            <span className="payment-method-badge">
                              {payment.paymentMethod || 'Razorpay'}
                            </span>
                          </td>
                          <td>
                            <span className="amount">₹{payment.amount}</span>
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

      {/* Payment Method Selection Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose Payment Method</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <Icons.X />
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-methods">
                <button 
                  className="payment-method-card"
                  onClick={() => handlePaymentMethodSelect('qr')}
                >
                  <div className="payment-method-icon">
                    <Icons.Grid />
                  </div>
                  <div className="payment-method-info">
                    <h4>UPI QR Code</h4>
                    <p>Scan & pay with any UPI app</p>
                  </div>
                  <Icons.ChevronRight />
                </button>
                <button 
                  className="payment-method-card"
                  onClick={() => handlePaymentMethodSelect('checkout')}
                >
                  <div className="payment-method-icon">
                    <Icons.CreditCard />
                  </div>
                  <div className="payment-method-info">
                    <h4>Card / UPI / Netbanking</h4>
                    <p>Pay via Razorpay checkout</p>
                  </div>
                  <Icons.ChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Payment Modal */}
      {qrCode && (
        <div className="modal-overlay">
          <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Scan QR to Pay</h3>
              <button className="modal-close" onClick={handleCancelQrPayment}>
                <Icons.X />
              </button>
            </div>
            <div className="modal-body">
              <div className="qr-payment-container">
                <div className="qr-code-wrapper">
                  <img src={qrCode.image_url} alt="Scan to Pay" className="qr-code-image" />
                </div>
                <div className="qr-payment-info">
                  <h4>₹{selectedService?.price}</h4>
                  <p>{qrCode.serviceName}</p>
                  <div className="qr-instructions">
                    <h5>How to pay:</h5>
                    <ol>
                      <li>Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                      <li>Scan this QR code</li>
                      <li>Complete the payment</li>
                      <li>Click "I've Paid" below</li>
                    </ol>
                  </div>
                  <div className="test-info">
                    <p><strong>💡 Test Mode Instructions:</strong></p>
                    <p>In test mode, simply click "I've Paid" button below to simulate successful payment.</p>
                    <p className="small-text">Real UPI apps won't work with test QR codes.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={handleCancelQrPayment}
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Cancelling...' : 'Cancel'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleQrPaymentComplete}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <>
                    <span className="spinner-small"></span> Verifying...
                  </>
                ) : (
                  <>✅ I've Paid</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
