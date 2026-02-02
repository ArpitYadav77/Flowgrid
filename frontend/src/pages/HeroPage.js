import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from '../components/Icons';

const HeroPage = () => {
  const navigate = useNavigate();
  const { user, completeFirstLogin, getRoleDisplayName, isProvider } = useAuth();

  const handleGoToDashboard = async () => {
    await completeFirstLogin();
    navigate('/dashboard');
  };

  const features = [
    {
      icon: <Icons.Calendar />,
      title: 'Real-time Slot Booking',
      description: 'Book or manage time slots instantly. No more phone tag or missed appointments.'
    },
    {
      icon: <Icons.Shield />,
      title: 'Secure Online Payments',
      description: 'Razorpay-powered payments. Safe, fast, and reliable transactions.'
    },
    {
      icon: <Icons.Block />,
      title: 'Zero Overbooking',
      description: 'Atomic slot locking ensures no double bookings. Ever.'
    },
    {
      icon: <Icons.Chart />,
      title: 'Business Analytics',
      description: 'Track revenue, bookings, and growth with beautiful dashboards.'
    }
  ];

  const audiences = [
    {
      icon: <Icons.User />,
      title: 'Customers',
      description: 'Book services instantly from salons, tutors, and local providers.'
    },
    {
      icon: <Icons.Scissors />,
      title: 'Service Providers',
      description: 'Manage your time, services, and income all in one place.'
    },
    {
      icon: <Icons.Building />,
      title: 'Local Businesses',
      description: 'Go digital and reach more customers with online booking.'
    }
  ];

  return (
    <div className="hero-page">
      {/* Navigation */}
      <nav className="hero-nav">
        <div className="hero-nav-content">
          <div className="hero-logo">
            <Icons.Logo />
            <span>FlowGrid</span>
          </div>
          <div className="hero-nav-user">
            <span className="hero-nav-greeting">
              Welcome, {user?.name?.split(' ')[0]}!
            </span>
            <div className="hero-nav-badge">
              {getRoleDisplayName(user?.role)}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              One platform to manage, book, and scale{' '}
              <span className="hero-title-accent">real-world services</span>
            </h1>
            <p className="hero-subtitle">
              FlowGrid brings salons, tutors, and local service providers online 
              with real-time bookings and secure payments.
            </p>
            <button 
              className="btn btn-primary btn-xl hero-cta"
              onClick={handleGoToDashboard}
            >
              Go to Dashboard
              <Icons.ArrowRight />
            </button>
          </div>
          
          <div className="hero-visual">
            <div className="hero-card hero-card-1">
              <div className="hero-card-icon">
                <Icons.Calendar />
              </div>
              <div className="hero-card-content">
                <span className="hero-card-label">Next Appointment</span>
                <span className="hero-card-value">Today, 5:00 PM</span>
                <span className="hero-card-detail">Haircut • ₹299</span>
              </div>
            </div>
            
            <div className="hero-card hero-card-2">
              <div className="hero-card-icon success">
                <Icons.Check />
              </div>
              <div className="hero-card-content">
                <span className="hero-card-label">Payment Received</span>
                <span className="hero-card-value">₹599</span>
                <span className="hero-card-detail">Facial Treatment</span>
              </div>
            </div>
            
            <div className="hero-card hero-card-3">
              <div className="hero-card-header">
                <Icons.Chart />
                <span>This Month</span>
              </div>
              <div className="hero-card-stats">
                <div className="hero-stat">
                  <span className="hero-stat-value">₹45,600</span>
                  <span className="hero-stat-label">Revenue</span>
                </div>
                <div className="hero-stat">
                  <span className="hero-stat-value">234</span>
                  <span className="hero-stat-label">Bookings</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="hero-features">
        <div className="hero-section-content">
          <h2 className="hero-section-title">What FlowGrid Offers</h2>
          <p className="hero-section-subtitle">
            Everything you need to {isProvider ? 'run your business' : 'book services'} efficiently
          </p>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="hero-audience">
        <div className="hero-section-content">
          <h2 className="hero-section-title">Who It's For</h2>
          <p className="hero-section-subtitle">
            Built for everyone in the local service ecosystem
          </p>
          
          <div className="audience-grid">
            {audiences.map((audience, index) => (
              <div key={index} className="audience-card">
                <div className="audience-icon">
                  {audience.icon}
                </div>
                <h3 className="audience-title">{audience.title}</h3>
                <p className="audience-description">{audience.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="hero-cta-section">
        <div className="hero-cta-content">
          <h2 className="hero-cta-title">
            Ready to {isProvider ? 'grow your business' : 'start booking'}?
          </h2>
          <p className="hero-cta-subtitle">
            Your dashboard is set up and ready to use.
          </p>
          <button 
            className="btn btn-primary btn-xl"
            onClick={handleGoToDashboard}
          >
            Go to Dashboard
            <Icons.ArrowRight />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="hero-footer">
        <div className="hero-footer-content">
          <div className="hero-footer-logo">
            <Icons.Logo />
            <span>FlowGrid</span>
          </div>
          <p className="hero-footer-text">
            © 2026 FlowGrid. Smart Service Booking Platform.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HeroPage;
