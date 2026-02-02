import React, { useState } from 'react';
import * as Icons from './Icons';

const BookingCalendar = ({ bookings = {} }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 31)); // January 31, 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: null
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        isCurrentMonth: true,
        date: dateStr,
        bookingCount: bookings[dateStr] || 0,
        isToday: i === 31 && month === 0 && year === 2026 // Mock today
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: null
      });
    }

    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <h2 className="card-title">Booking Calendar</h2>
          <span className="card-subtitle">{monthNames[month]} {year}</span>
        </div>
        <div className="card-actions">
          <button className="icon-button-small" onClick={() => navigateMonth(-1)}>
            <Icons.ChevronLeft style={{ transform: 'rotate(0deg)' }} />
          </button>
          <button className="icon-button-small" onClick={() => navigateMonth(1)}>
            <Icons.ChevronRight />
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="calendar-grid">
          <div className="calendar-header">
            {dayNames.map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-body">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.bookingCount > 0 ? 'has-bookings' : ''}`}
              >
                {day.day}
                {day.bookingCount > 0 && (
                  <div className="booking-dots">
                    {[...Array(Math.min(day.bookingCount, 3))].map((_, i) => (
                      <span key={i} className="booking-dot"></span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-dot"></span>
            <span>Booking scheduled</span>
          </div>
          <div className="legend-item">
            <span className="legend-today"></span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
