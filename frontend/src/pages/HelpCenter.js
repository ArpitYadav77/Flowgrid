import React from 'react';
import * as Icons from '../components/Icons';

const HelpCenter = () => {
  return (
    <div className="help-center-container">
      <div className="help-center-content">
        <div className="help-header">
          <h1>Welcome to FlowGrid Help Center 👋</h1>
          <p className="help-subtitle">
            We're here to help you get started and resolve common issues quickly.
          </p>
        </div>

        <div className="help-section">
          <h2>🔹 General Steps to Use FlowGrid</h2>
          
          <div className="help-steps">
            <div className="help-step-card">
              <div className="step-icon">
                <Icons.Search />
              </div>
              <div className="step-content">
                <h3>Browse Services</h3>
                <p>Explore nearby services like salons, tutors, car washers, and more.</p>
              </div>
            </div>

            <div className="help-step-card">
              <div className="step-icon">
                <Icons.Calendar />
              </div>
              <div className="step-content">
                <h3>Book a Service</h3>
                <p>Select your preferred service, choose a time slot, and confirm your booking.</p>
              </div>
            </div>

            <div className="help-step-card">
              <div className="step-icon">
                <Icons.Layers />
              </div>
              <div className="step-content">
                <h3>Manage Bookings</h3>
                <p>View, reschedule, or cancel your bookings from My Bookings.</p>
              </div>
            </div>

            <div className="help-step-card">
              <div className="step-icon">
                <Icons.CreditCard />
              </div>
              <div className="step-content">
                <h3>Payments & History</h3>
                <p>Track completed payments and invoices under Payment History.</p>
              </div>
            </div>

            <div className="help-step-card">
              <div className="step-icon">
                <Icons.SettingsGear />
              </div>
              <div className="step-content">
                <h3>Profile & Settings</h3>
                <p>Update your personal details and preferences in Settings.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="help-contact-section">
          <h2>📩 Need More Help?</h2>
          <p>If you're facing any issues or have questions, feel free to reach out to us:</p>
          
          <div className="contact-cards">
            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <div className="contact-details">
                <h4>Email</h4>
                <a href="mailto:arpityadav.dav@gmail.com">arpityadav.dav@gmail.com</a>
              </div>
            </div>

            <div className="contact-card">
              <div className="contact-icon">📞</div>
              <div className="contact-details">
                <h4>Phone</h4>
                <a href="tel:9999777001">9999-777-001</a>
              </div>
            </div>
          </div>

          <p className="response-time">We usually respond within 24 hours.</p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
