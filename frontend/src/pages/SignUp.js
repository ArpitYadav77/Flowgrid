import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from '../components/Icons';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const getPasswordStrength = (password) => {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[\d]/.test(password),
    /[@$!%*?&]/.test(password)
  ];
  return checks.filter(Boolean).length;
};

const SignUp = () => {
  const navigate = useNavigate();
  const { signup, getRoleDisplayName } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const roles = [
    { id: 'customer',          name: 'Customer',          description: 'Book services from local providers' },
    { id: 'salon_owner',       name: 'Salon Owner',        description: 'Manage salon bookings & services' },
    { id: 'tutor',             name: 'Tutor',              description: 'Schedule tutoring sessions' },
    { id: 'car_washer',        name: 'Car Washer',         description: 'Manage car wash appointments' },
    { id: 'service_provider',  name: 'Service Provider',   description: 'For other local services' },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = () => {
    if (!formData.role)                              { setError('Please select a role'); return false; }
    if (!formData.name.trim())                       { setError('Name is required'); return false; }
    if (!formData.email.trim())                      { setError('Email is required'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setError('Please enter a valid email address'); return false; }
    if (!formData.password)                          { setError('Password is required'); return false; }
    if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
      setError('Password must be 8+ characters with uppercase, lowercase, number and special character (@$!%*?&)');
      return false;
    }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    const result = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role
    });
    if (result.success && result.pendingVerification) {
      navigate('/verify-email', { state: { email: formData.email, devOTP: result.devOTP } });
    } else if (result.success) {
      navigate('/welcome');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const selectedRole = roles.find(r => r.id === formData.role);

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Panel */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-logo">
              <Icons.Logo />
              <span className="auth-logo-text">FlowGrid</span>
            </div>
            <h1 className="auth-brand-title">Join FlowGrid today</h1>
            <p className="auth-brand-subtitle">
              Whether you're booking services or providing them, FlowGrid has you covered.
            </p>
            <div className="auth-testimonial">
              <p className="testimonial-text">
                "FlowGrid transformed how I manage my salon. No more phone calls,
                no more missed appointments. Everything runs smoothly now."
              </p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">PS</div>
                <div className="testimonial-info">
                  <strong>Priya Sharma</strong>
                  <span>Salon Owner, Mumbai</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-form-panel">
          <div className="auth-form-container signup-container">
            <div className="auth-form-header">
              <h2 className="auth-form-title">Create your account</h2>
              <p className="auth-form-subtitle">Get started — it only takes a minute</p>
            </div>

            {error && (
              <div className="auth-error">
                <Icons.AlertCircle />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form signup-form">
              {/* Role Dropdown */}
              <div className="form-group">
                <label className="form-label">I am a…</label>
                <div className="role-select-wrapper">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`form-input role-select ${formData.role ? 'has-value' : ''}`}
                  >
                    <option value="" disabled>Select your role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <span className="role-select-arrow">
                    <Icons.ChevronDown size={18} />
                  </span>
                </div>
                {selectedRole && (
                  <p className="role-hint">{selectedRole.description}</p>
                )}
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">
                  {formData.role === 'customer' ? 'Full Name' : formData.role ? 'Business Name' : 'Name'}
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={formData.role === 'customer' ? 'John Doe' : 'Your name or business'}
                    className="form-input"
                    required
                    autoComplete="name"
                  />
                  <Icons.User className="input-icon" size={20} />
                </div>
              </div>

              {/* Email */}
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

              {/* Password row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min. 8 chars, A-Z, 0-9, @$!"
                      className="form-input"
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide' : 'Show'}>
                      {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                    </button>
                  </div>
                  {formData.password && (() => {
                    const strength = getPasswordStrength(formData.password);
                    const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
                    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
                    return (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                          {[1,2,3,4,5].map(i => (
                            <div key={i} style={{
                              flex: 1, height: 4, borderRadius: 2,
                              background: i <= strength ? colors[strength] : '#e5e7eb',
                              transition: 'background 0.2s'
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: colors[strength] }}>{labels[strength]}</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm</label>
                  <div className="input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className="form-input"
                      required
                      autoComplete="new-password"
                    />
                    <button type="button" className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                      {showConfirmPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
              >
                {loading ? (
                  <><Icons.Loader className="btn-loader" /> Creating account…</>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account?{' '}
                <Link to="/signin" className="auth-link">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
