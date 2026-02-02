import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from '../components/Icons';

const SignUp = () => {
  const navigate = useNavigate();
  const { signup, getRoleDisplayName } = useAuth();
  
  const [step, setStep] = useState(1);
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

  const roles = [
    { 
      id: 'customer', 
      name: 'Customer', 
      description: 'Book services from local providers',
      icon: 'User'
    },
    { 
      id: 'salon_owner', 
      name: 'Salon Owner', 
      description: 'Manage salon bookings & services',
      icon: 'Scissors'
    },
    { 
      id: 'tutor', 
      name: 'Tutor', 
      description: 'Schedule tutoring sessions',
      icon: 'Book'
    },
    { 
      id: 'car_washer', 
      name: 'Car Washer', 
      description: 'Manage car wash appointments',
      icon: 'Car'
    },
    { 
      id: 'service_provider', 
      name: 'Service Provider', 
      description: 'For other local services',
      icon: 'Briefcase'
    }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const selectRole = (roleId) => {
    setFormData({ ...formData, role: roleId });
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.role) {
      setError('Please select a role');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    setLoading(true);
    setError('');

    const result = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role
    });
    
    if (result.success) {
      navigate('/welcome');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      User: Icons.User,
      Scissors: Icons.Scissors,
      Book: Icons.Book,
      Car: Icons.Car,
      Briefcase: Icons.Briefcase
    };
    const IconComponent = iconMap[iconName] || Icons.User;
    return <IconComponent />;
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
              Join FlowGrid today
            </h1>
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

        {/* Right Panel - Form */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            {/* Step Indicator */}
            <div className="step-indicator">
              <div className={`step ${step >= 1 ? 'active' : ''}`}>
                <span className="step-number">1</span>
                <span className="step-label">Select Role</span>
              </div>
              <div className="step-line"></div>
              <div className={`step ${step >= 2 ? 'active' : ''}`}>
                <span className="step-number">2</span>
                <span className="step-label">Create Account</span>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <Icons.AlertCircle />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="role-selection">
                <div className="auth-form-header">
                  <h2 className="auth-form-title">Who are you?</h2>
                  <p className="auth-form-subtitle">
                    Select the option that best describes you
                  </p>
                </div>

                <div className="role-grid">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className={`role-card ${formData.role === role.id ? 'selected' : ''}`}
                      onClick={() => selectRole(role.id)}
                    >
                      <div className="role-icon">
                        {getIconComponent(role.icon)}
                      </div>
                      <h3 className="role-name">{role.name}</h3>
                      <p className="role-description">{role.description}</p>
                      {formData.role === role.id && (
                        <div className="role-check">
                          <Icons.Check />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleNext}
                >
                  Continue
                  <Icons.ArrowRight />
                </button>
              </div>
            )}

            {/* Step 2: Account Details */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-form-header">
                  <h2 className="auth-form-title">Create your account</h2>
                  <p className="auth-form-subtitle">
                    Signing up as <strong>{getRoleDisplayName(formData.role)}</strong>
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {formData.role === 'customer' ? 'Full Name' : 'Business Name'}
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={formData.role === 'customer' ? 'John Doe' : 'Your Business Name'}
                      className="form-input"
                      required
                      autoComplete="name"
                    />
                    <Icons.User className="input-icon" size={20} />
                  </div>
                </div>

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
                      placeholder="Minimum 6 characters"
                      className="form-input"
                      required
                      autoComplete="new-password"
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

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className="form-input"
                      required
                      autoComplete="new-password"
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

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleBack}
                  >
                    <Icons.ArrowLeft />
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Icons.Loader className="btn-loader" />
                        Creating...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <Link to="/signin" className="auth-link">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
