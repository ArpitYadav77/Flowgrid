import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as Icons from './Icons';

const TopBar = ({ onMobileMenuToggle, onViewChange }) => {
  const { user, logout } = useAuth();
  const { 
    notifications, 
    getUnreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll 
  } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = useRef(null);
  const notificationRef = useRef(null);
  const appSwitcherRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationPanel(false);
      }
      if (appSwitcherRef.current && !appSwitcherRef.current.contains(event.target)) {
        setShowAppSwitcher(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showNotificationPanel || showAppSwitcher || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationPanel, showAppSwitcher, showUserMenu]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const toggleNotificationPanel = () => {
    setShowNotificationPanel(!showNotificationPanel);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getNotificationIcon = (iconName) => {
    const IconComponent = Icons[iconName];
    return IconComponent ? <IconComponent /> : <Icons.Bell />;
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleNavigate = (view) => {
    if (onViewChange) {
      onViewChange(view);
    }
    setShowUserMenu(false);
    setShowAppSwitcher(false);
  };

  const unreadCount = getUnreadCount();

  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button className="mobile-menu-toggle" onClick={onMobileMenuToggle}>
          <Icons.Menu />
        </button>
        <div className="search-container">
          <Icons.Search className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search bookings, customers, services..."
            value={searchQuery}
            onChange={handleSearch}
          />
          <span className="search-shortcut">⌘K</span>
        </div>
      </div>

      <div className="top-bar-right">
        <div className="notification-container" ref={notificationRef}>
          <button className="icon-button" onClick={toggleNotificationPanel}>
            <Icons.Bell />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotificationPanel && (
            <>
              <div className="notification-overlay" onClick={() => setShowNotificationPanel(false)}></div>
              <div className="notification-panel">
              <div className="notification-panel-header">
                <h3>Notifications</h3>
                <div className="notification-header-actions">
                  <div className="notification-actions">
                    {unreadCount > 0 && (
                      <button className="text-btn" onClick={markAllAsRead}>
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button className="text-btn" onClick={clearAll}>
                        Clear all
                      </button>
                    )}
                  </div>
                  <button 
                    className="notification-close-btn" 
                    onClick={() => setShowNotificationPanel(false)}
                    aria-label="Close notifications"
                  >
                    <Icons.X />
                  </button>
                </div>
              </div>

              <div className="notification-panel-body">
                {notifications.length === 0 ? (
                  <div className="empty-notifications">
                    <Icons.Bell />
                    <p>No notifications</p>
                    <span>You're all caught up!</span>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-icon">
                        {getNotificationIcon(notification.icon)}
                      </div>
                      <div className="notification-content">
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className="notification-time">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                      </div>
                      <button
                        className="notification-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Icons.X />
                      </button>
                      {!notification.read && (
                        <div className="notification-unread-dot"></div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="notification-panel-footer">
                  <button className="view-all-btn">
                    View All Notifications
                  </button>
                </div>
              )}
            </div>
            </>
          )}
        </div>

        <div className="app-switcher-container" ref={appSwitcherRef}>
          <button className="icon-button" onClick={() => setShowAppSwitcher(!showAppSwitcher)}>
            <Icons.Grid />
          </button>

          {showAppSwitcher && (
            <div className="app-switcher-dropdown">
              <div className="dropdown-header">Quick Access</div>
              <button className="dropdown-item" onClick={() => handleNavigate('bookings')}>
                <Icons.Calendar size={18} />
                <span>Calendar</span>
              </button>
              <button className="dropdown-item" onClick={() => handleNavigate('payments')}>
                <Icons.DollarSign size={18} />
                <span>Payments</span>
              </button>
              <button className="dropdown-item" onClick={() => handleNavigate('help')}>
                <Icons.HelpCircle size={18} />
                <span>Help Center</span>
              </button>
            </div>
          )}
        </div>

        <div className="user-menu-container" ref={userMenuRef}>
          <button className="user-menu" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar small">
              <span>{userInitials}</span>
            </div>
            <Icons.ChevronDown className="dropdown-icon" />
          </button>

          {showUserMenu && (
            <div className="user-menu-dropdown">
              <div className="dropdown-user-info">
                <div className="user-avatar medium">
                  <span>{userInitials}</span>
                </div>
                <div className="user-details">
                  <div className="user-name">{user?.name || 'User'}</div>
                  <div className="user-email">{user?.email || ''}</div>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={() => handleNavigate('profile')}>
                <Icons.User size={18} />
                <span>Profile</span>
              </button>
              <button className="dropdown-item" onClick={() => handleNavigate('settings')}>
                <Icons.Settings size={18} />
                <span>Settings</span>
              </button>
              <button className="dropdown-item" onClick={() => handleNavigate('help')}>
                <Icons.HelpCircle size={18} />
                <span>Help & Support</span>
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item danger" onClick={handleLogout}>
                <Icons.LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
