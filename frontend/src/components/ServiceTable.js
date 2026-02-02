import React from 'react';
import * as Icons from './Icons';

const ServiceTable = ({ services, onEdit, onView }) => {
  const getServiceIcon = (iconType) => {
    switch (iconType) {
      case 'consultation':
        return <Icons.MessageSquare />;
      case 'workshop':
        return <Icons.Users />;
      case 'audit':
        return <Icons.FileText />;
      case 'premium':
        return <Icons.Star />;
      default:
        return <Icons.MessageSquare />;
    }
  };

  const formatDuration = (minutes) => {
    return `${minutes} min`;
  };

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Service Name</th>
            <th>Category</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Bookings</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service.id}>
              <td>
                <div className="service-info">
                  <div className={`service-icon ${service.icon}`}>
                    {getServiceIcon(service.icon)}
                  </div>
                  <div>
                    <span className="service-name">{service.name}</span>
                    <span className="service-id">#{service.id}</span>
                  </div>
                </div>
              </td>
              <td>
                <span className="category-tag">{service.category}</span>
              </td>
              <td>{formatDuration(service.duration)}</td>
              <td>{formatPrice(service.price)}</td>
              <td>
                <div className="booking-count">
                  <span className="count">{service.bookings}</span>
                  <span className={`trend ${service.trend >= 0 ? 'positive' : 'negative'}`}>
                    {service.trend >= 0 ? '↑' : '↓'} {Math.abs(service.trend)}%
                  </span>
                </div>
              </td>
              <td>
                <span className={`status-badge ${service.status}`}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button 
                    className="action-btn" 
                    title="Edit"
                    onClick={() => onEdit && onEdit(service)}
                  >
                    <Icons.Edit />
                  </button>
                  <button 
                    className="action-btn" 
                    title="View"
                    onClick={() => onView && onView(service)}
                  >
                    <Icons.Eye />
                  </button>
                  <button className="action-btn" title="More">
                    <Icons.MoreHorizontal />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ServiceTable;
