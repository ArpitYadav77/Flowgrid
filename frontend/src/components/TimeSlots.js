import React from 'react';
import { useNotification } from '../context/NotificationContext';

const TimeSlots = ({ schedule = [] }) => {
  const { showNotification } = useNotification();

  const handleSlotClick = (slot) => {
    if (slot.type === 'available') {
      showNotification('Opening booking form...', 'info');
    } else {
      showNotification(`Viewing booking: ${slot.serviceName}`, 'info');
    }
  };

  const formatDuration = (minutes) => {
    return `${minutes} min`;
  };

  const getStatusLabel = (slot) => {
    if (slot.type === 'available') return 'Available';
    return slot.status.charAt(0).toUpperCase() + slot.status.slice(1);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <h2 className="card-title">Today's Schedule</h2>
          <span className="card-subtitle">January 31, 2026</span>
        </div>
        <button className="btn btn-secondary btn-small">View All</button>
      </div>
      <div className="card-body">
        <div className="time-slots">
          {schedule.map((slot, index) => (
            <div
              key={index}
              className={`time-slot ${slot.type === 'available' ? 'available' : 'booked'}`}
              onClick={() => handleSlotClick(slot)}
            >
              <div className="slot-time">
                <span className="time">{slot.time}</span>
                <span className="duration">{formatDuration(slot.duration)}</span>
              </div>
              <div className="slot-content">
                <span className="slot-title">{slot.serviceName}</span>
                <span className="slot-client">{slot.clientName}</span>
              </div>
              <span className={`slot-status ${slot.status || slot.type}`}>
                {getStatusLabel(slot)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeSlots;
