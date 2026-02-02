import React, { useState, useEffect } from 'react';
import { unsplashAPI } from '../services/api';
import '../styles/ServiceCard.css';

const ServiceCard = ({ service, onBook }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchImage = async () => {
      if (!service.imageQuery) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await unsplashAPI.getRandom(service.imageQuery);
        
        if (response.data.success && response.data.data) {
          setImageUrl(response.data.data.thumbnail);
        }
      } catch (err) {
        console.error('Error fetching image:', err);
        setError('Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [service.imageQuery]);

  const formatPrice = (price) => {
    return `$${price.toFixed(2)}`;
  };

  const formatDuration = (minutes) => {
    return `${minutes} min`;
  };

  return (
    <div className="service-card">
      <div className="service-card-image">
        {loading ? (
          <div className="image-loading">Loading...</div>
        ) : error ? (
          <div className="image-error">{error}</div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={service.name} />
        ) : (
          <div className="image-placeholder">{service.name}</div>
        )}
      </div>
      
      <div className="service-card-content">
        <div className="service-card-header">
          <h3 className="service-card-title">{service.name}</h3>
          <span className={`service-badge ${service.status}`}>
            {service.status}
          </span>
        </div>
        
        <p className="service-category">{service.category}</p>
        
        <div className="service-card-details">
          <div className="service-detail">
            <span className="detail-label">Duration</span>
            <span className="detail-value">{formatDuration(service.duration)}</span>
          </div>
          <div className="service-detail">
            <span className="detail-label">Price</span>
            <span className="detail-value">{formatPrice(service.price)}</span>
          </div>
          <div className="service-detail">
            <span className="detail-label">Bookings</span>
            <span className="detail-value">{service.bookings}</span>
          </div>
        </div>
        
        {onBook && (
          <button 
            className="book-button"
            onClick={() => onBook(service)}
            disabled={service.status !== 'active'}
          >
            Book Now
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;
