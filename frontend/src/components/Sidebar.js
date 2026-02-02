import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from './Icons';

const getNavSections = (isProvider) => {
  if (isProvider) {
    return [
      {
        title: 'Main',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard', badge: null },
          { id: 'services', label: 'My Services', icon: 'Layers', badge: null },
          { id: 'bookings', label: 'Bookings', icon: 'Calendar', badge: null },
        ]
      },
      {
        title: 'Finance',
        items: [
          { id: 'payments', label: 'Payments', icon: 'CreditCard', badge: null },
          { id: 'analytics', label: 'Analytics', icon: 'PieChart', badge: null },
        ]
      },
      {
        title: 'System',
        items: [
          { id: 'settings', label: 'Settings', icon: 'SettingsGear', badge: null },
          { id: 'help', label: 'Help Center', icon: 'HelpCircle', badge: null },
        ]
      }
    ];
  }

  return [
    {
      title: 'Main',
      items: [
        { id: 'browse', label: 'Browse Services', icon: 'Search', badge: null },
        { id: 'bookings', label: 'My Bookings', icon: 'Calendar', badge: null },
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'payments', label: 'Payment History', icon: 'CreditCard', badge: null },
        { id: 'settings', label: 'Settings', icon: 'SettingsGear', badge: null },
        { id: 'help', label: 'Help Center', icon: 'HelpCircle', badge: null },
      ]
    }
  ];
};

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose, onViewChange }) => {
  const navigate = useNavigate();
  const { user, logout, isProvider, getRoleDisplayName } = useAuth();
  const [activeItem, setActiveItem] = React.useState('dashboard');
  
  const navSections = getNavSections(isProvider);

  const handleNavClick = (itemId) => {
    setActiveItem(itemId);
    if (onViewChange) {
      onViewChange(itemId);
    }
    if (window.innerWidth <= 1024) {
      onMobileClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={onMobileClose} />
      )}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Icons.Logo className="logo-icon" />
            <span className="logo-text">FlowGrid</span>
          </div>
          <button className="sidebar-toggle" onClick={onToggle}>
            <Icons.ChevronLeft />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} className="nav-section">
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => {
                const IconComponent = Icons[item.icon];
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.id);
                    }}
                  >
                    {IconComponent && <IconComponent className="nav-icon" />}
                    <span className="nav-text">{item.label}</span>
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </a>
                );
              })}
            </div>
          ))}

          {/* Logout */}
          <div className="nav-section">
            <a
              href="#logout"
              className="nav-item logout-item"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              <Icons.LogOut className="nav-icon" />
              <span className="nav-text">Sign Out</span>
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              <span>{userInitials}</span>
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">{getRoleDisplayName(user?.role)}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
