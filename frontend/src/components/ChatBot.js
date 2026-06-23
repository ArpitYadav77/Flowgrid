import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { chatbotAPI, slotsAPI } from '../services/api';
import { Clock, Calendar, MessageSquare, RefreshCw, Send, CheckCircle, Briefcase, X } from './Icons';
import '../styles/ChatBot.css';

const ChatBot = ({ onBookingComplete }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  // State variables
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [session, setSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [customDate, setCustomDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [upcomingBooking, setUpcomingBooking] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll to the newest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Greeting trigger
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendInitialGreeting();
    }
  }, [isOpen]);

  // Proactively check for upcoming bookings on mount
  useEffect(() => {
    const checkUpcomingBookings = async () => {
      try {
        const res = await slotsAPI.getBookings();
        if (res.data && res.data.data) {
          const todayStr = new Date().toISOString().split('T')[0];
          const activeBooking = res.data.data.find(
            b => b.date === todayStr && (b.status === 'confirmed' || b.status === 'pending')
          );
          if (activeBooking) {
            setUpcomingBooking(activeBooking);
          }
        }
      } catch (err) {
        console.error('Failed to check upcoming bookings:', err);
      }
    };

    if (user) {
      checkUpcomingBookings();
    }
  }, [user]);

  // Fetch real-time available slots when the date is updated
  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate) return;
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.type === 'bot' && lastMessage.showAllSlots) {
        setLoadingSlots(true);
        try {
          // 'USR-SALON-01' is the hardcoded providerId for Priya's Beauty Salon
          const res = await slotsAPI.getAvailableSlots({
            date: selectedDate,
            providerId: 'USR-SALON-01'
          });
          if (res.data && res.data.slots) {
            const activeTimes = res.data.slots.map(s => s.time);
            setAvailableSlots(activeTimes);
          }
        } catch (err) {
          console.error('Error fetching slots for chatbot:', err);
        } finally {
          setLoadingSlots(false);
        }
      }
    };

    fetchSlots();
  }, [messages, selectedDate]);

  // Fetch user bookings for history view
  const fetchBookingHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await slotsAPI.getBookings();
      if (res.data && res.data.data) {
        setHistoryBookings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch booking history:', err);
      showNotification('Failed to load booking history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchBookingHistory();
    }
  }, [showHistory]);

  const sendInitialGreeting = () => {
    const greeting = {
      id: Date.now(),
      type: 'bot',
      message: `Welcome! What would you like to book today?`,
      options: ['Haircut', 'Beard Trim', 'Facial', 'View Services'],
      timestamp: new Date()
    };
    setMessages([greeting]);
  };

  const sendMessage = async (messageText, isOptionClick = false) => {
    if (!messageText.trim() && !isOptionClick) return;

    // Map selections to user-friendly text if needed
    let displayMessage = messageText;
    if (messageText === 'Haircut') displayMessage = 'Book Haircut';
    if (messageText === 'Beard Trim') displayMessage = 'Book Beard Trim';
    if (messageText === 'Facial') displayMessage = 'Book Facial';

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: displayMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await chatbotAPI.sendMessage(messageText);
      const data = response.data;

      if (data.success) {
        setSession(data.session);

        // Simulate typing delay
        setTimeout(() => {
          const botMessage = {
            id: Date.now() + 1,
            type: 'bot',
            message: data.botResponse.message,
            options: data.botResponse.options,
            showAllSlots: data.botResponse.showAllSlots,
            allSlots: data.botResponse.allSlots,
            requiresPayment: data.botResponse.requiresPayment,
            bookingDetails: data.botResponse.bookingDetails,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, botMessage]);
          setIsTyping(false);
        }, 800);
      }
    } catch (error) {
      console.error('Chat error:', error);
      showNotification('Failed to send message', 'error');
      setIsTyping(false);
    }
  };

  const handleOptionClick = (option) => {
    // Check if the clicked option is a date selection to store in React state
    const today = new Date();
    if (option === 'Today') {
      const todayStr = today.toISOString().split('T')[0];
      setSelectedDate(todayStr);
    } else if (option === 'Tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setSelectedDate(tomorrowStr);
    } else if (option.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setSelectedDate(option);
    }
    
    sendMessage(option, true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const resetChat = async () => {
    try {
      await chatbotAPI.resetSession();
      setMessages([]);
      setSession(null);
      setSelectedDate(null);
      setCustomDate('');
      setAvailableSlots([]);
      sendInitialGreeting();
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  const isSlotAvailable = (slotTime) => {
    // Match times: e.g. slotTime="09:00 AM" or "09:00" vs availableSlots=["09:00", "09:30"]
    const cleanedSlotTime = slotTime.split(' ')[0];
    return availableSlots.includes(cleanedSlotTime);
  };

  return (
    <>
      {/* Floating launcher button: hidden when open */}
      <div className={`chat-launcher-container ${isOpen ? 'hidden' : ''}`}>
        <button
          className="chat-toggle-btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open salon assistant chat"
        >
          <MessageSquare size={24} />
          <span className="chat-badge">Assistant</span>
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Chat Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-avatar">
                <Briefcase size={20} />
              </div>
              <div>
                <h3>Salon Assistant</h3>
                <span className="chatbot-status">Online</span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button 
                onClick={() => setShowHistory(!showHistory)} 
                title="Booking History" 
                className={`chat-icon-btn ${showHistory ? 'active' : ''}`}
              >
                <Calendar size={16} />
              </button>
              <button onClick={resetChat} title="Reset chat" className="chat-icon-btn">
                <RefreshCw size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} title="Minimize chat" className="chat-icon-btn">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Booking History Overlay */}
          {showHistory && (
            <div className="chat-history-overlay">
              <div className="chat-history-header">
                <h4>Booking History</h4>
                <button onClick={() => setShowHistory(false)} className="chat-icon-btn" style={{ color: '#1e293b' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="chat-history-list">
                {loadingHistory ? (
                  <div className="chat-history-empty">Loading history...</div>
                ) : historyBookings.length === 0 ? (
                  <div className="chat-history-empty">
                    <Calendar size={28} />
                    <span>No bookings found.</span>
                  </div>
                ) : (
                  historyBookings.map((b) => (
                    <div key={b.id} className="chat-history-item">
                      <div className="chat-history-item-meta">
                        <span>{b.date} • {b.time}</span>
                        <span className={`chat-history-status-badge ${b.status}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="chat-history-item-title">{b.serviceName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                        Amount: ₹{b.price}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chat Body */}
          <div className="chatbot-messages">
            {/* Proactive Booking Reminder */}
            {upcomingBooking && (
              <div className="chat-reminder-banner">
                <Clock size={16} />
                <span>
                  Reminder: You have an upcoming <strong>{upcomingBooking.serviceName}</strong> today at <strong>{upcomingBooking.time}</strong>!
                </span>
              </div>
            )}

            {messages.map((msg, index) => {
              const isLastMessage = index === messages.length - 1;
              return (
                <div key={msg.id} className={`chat-message ${msg.type}`}>
                  {msg.type === 'bot' && (
                    <div className="chat-message-avatar">
                      <Briefcase size={14} />
                    </div>
                  )}
                  <div className="chat-message-content">
                    <div className="chat-message-text">{msg.message}</div>

                    {/* Booking Confirmation Card */}
                    {msg.requiresPayment && msg.bookingDetails && (
                      <div className="booking-summary-card">
                        <div className="booking-summary-header">
                          <CheckCircle size={14} style={{ color: '#10b981' }} />
                          <span>Booking Summary</span>
                        </div>
                        <div className="booking-summary-body">
                          <div className="booking-summary-item">
                            <span>Service:</span>
                            <strong>{msg.bookingDetails.services.map(s => s.name).join(', ')}</strong>
                          </div>
                          <div className="booking-summary-item">
                            <span>Date:</span>
                            <strong>{msg.bookingDetails.date}</strong>
                          </div>
                          <div className="booking-summary-item">
                            <span>Time:</span>
                            <strong>{msg.bookingDetails.time}</strong>
                          </div>
                          <div className="booking-summary-item total">
                            <span>Total Amount:</span>
                            <span>₹{msg.bookingDetails.total}</span>
                          </div>
                        </div>
                        <div className="chat-payment-action">
                          <button
                            className="chat-payment-btn"
                            onClick={() => {
                              if (onBookingComplete) {
                                onBookingComplete(msg.bookingDetails);
                              }
                            }}
                          >
                            💳 Pay Now - ₹{msg.bookingDetails.total}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick action chips (Only show on the very last bot message in the stream) */}
                    {msg.options && msg.options.length > 0 && !msg.requiresPayment && isLastMessage && !isTyping && (
                      <div className="chat-options">
                        {msg.options.map((option, idx) => {
                          if (option === 'Choose Date') return null; // Rendered by inline Date picker instead
                          return (
                            <button
                              key={idx}
                              className="chat-option-btn"
                              onClick={() => handleOptionClick(option)}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline Date Picker */}
                    {msg.options && msg.options.includes('Choose Date') && isLastMessage && !isTyping && (
                      <div className="chat-date-picker">
                        <span className="chat-date-picker-label">Select Date:</span>
                        <div className="chat-date-picker-input-group">
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                          />
                          <button
                            disabled={!customDate}
                            onClick={() => {
                              handleOptionClick(customDate);
                              setCustomDate('');
                            }}
                            className="chat-date-submit-btn"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Real-time Time Slots Grid */}
                    {msg.showAllSlots && msg.allSlots && isLastMessage && !isTyping && (
                      <div className="chat-time-slots">
                        <div className="chat-time-slots-label">
                          {loadingSlots ? 'Updating slot availability...' : 'Available Time Slots:'}
                        </div>
                        <div className="chat-time-slots-grid">
                          {msg.allSlots.map((slot, idx) => {
                            const isAvail = isSlotAvailable(slot);
                            return (
                              <button
                                key={idx}
                                className="chat-time-slot-btn"
                                disabled={loadingSlots || !isAvail}
                                onClick={() => handleOptionClick(slot)}
                                title={isAvail ? 'Available' : 'Already Booked'}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="chat-message bot">
                <div className="chat-message-avatar">
                  <Briefcase size={14} />
                </div>
                <div className="chat-message-content">
                  <div className="chat-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Bottom Chat Input Footer */}
          <form className="chatbot-input" onSubmit={handleSubmit}>
            <div className="chatbot-input-wrapper">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isTyping}
              />
              <button 
                type="submit" 
                className="chat-send-btn" 
                disabled={!inputMessage.trim() || isTyping}
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
