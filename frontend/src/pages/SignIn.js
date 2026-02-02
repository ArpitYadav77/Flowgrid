import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from '../components/Icons';

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      if (result.isFirstLogin) {
        navigate('/welcome');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  // Demo accounts
  const demoAccounts = [
    { email: 'customer@flowgrid.com', password: 'password123', role: 'Customer' },
    { email: 'salon@flowgrid.com', password: 'password123', role: 'Salon Owner' },
    { email: 'tutor@flowgrid.com', password: 'password123', role: 'Tutor' }
  ];

  const fillDemoAccount = (account) => {
    setFormData({
      email: account.email,
      password: account.password
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Panel - Branding */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-logo">
              <Icons.Logo />
              <span className="auth-logo-text">FlowGrid</span>
            </div>
            <h1 className="auth-brand-title">
              Welcome back to FlowGrid
            </h1>
            <p className="auth-brand-subtitle">
              Manage your bookings, services, and business all in one place.
            </p>
            
            <div className="auth-features">
              <div className="auth-feature">
                <div className="auth-feature-icon">
                  <Icons.Calendar />
                </div>
                <div className="auth-feature-text">
                  <strong>Real-time Booking</strong>
                  <span>No double bookings, ever</span>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon">
                  <Icons.Shield />
                </div>
                <div className="auth-feature-text">
                  <strong>Secure Payments</strong>
                  <span>Powered by Razorpay</span>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon">
                  <Icons.Chart />
                </div>
                <div className="auth-feature-text">
                  <strong>Business Analytics</strong>
                  <span>Track growth & revenue</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2 className="auth-form-title">Sign in</h2>
              <p className="auth-form-subtitle">
                Enter your credentials to access your account
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <Icons.AlertCircle />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="form-input"
                    required
                    autoComplete="email"
                  />
                  <Icons.Mail className="input-icon" size={20} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="form-input"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Icons.Loader className="btn-loader" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>or try a demo account</span>
            </div>

            <div className="demo-accounts">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  type="button"
                  className="demo-account-btn"
                  onClick={() => fillDemoAccount(account)}
                >
                  <Icons.User />
                  <span>{account.role}</span>
                </button>
              ))}
            </div>

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="auth-link">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
