import React, { useEffect, useState } from 'react';
import * as Icons from './Icons';

const Notification = ({ message, type = 'info', onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 200);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Icons.CheckCircle />;
      case 'error':
        return <Icons.XCircle />;
      default:
        return <Icons.InfoCircle />;
    }
  };

  return (
    <div className={`notification-toast notification-${type} ${isExiting ? 'notification-out' : ''}`}>
      <span className="notification-icon">{getIcon()}</span>
      <span className="notification-message">{message}</span>
      <button className="notification-close" onClick={handleClose}>
        <Icons.X />
      </button>
    </div>
  );
};

export default Notification;
