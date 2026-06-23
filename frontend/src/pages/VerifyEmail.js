import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import * as Icons from '../components/Icons';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 30; // 30 seconds

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP } = useAuth();

  // Email passed from SignUp or SignIn via navigation state
  const [email, setEmail] = useState(location.state?.email || '');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY_SECONDS);

  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Focus first empty input on mount & handle dev OTP autofill
  useEffect(() => {
    if (location.state?.devOTP) {
      const otpDigits = location.state.devOTP.toString().split('');
      setDigits(otpDigits);
      setSuccess(`[Dev Mode] Verification code is: ${location.state.devOTP}`);
    } else {
      inputRefs.current[0]?.focus();
    }
  }, [location.state]);

  const handleDigitChange = (index, value) => {
    // Accept only single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);
    setError('');

    // Move to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Allow paste handled separately
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { updated[i] = ch; });
    setDigits(updated);
    const nextEmpty = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextEmpty]?.focus();
  };

  const handleVerify = useCallback(async (e) => {
    e?.preventDefault();
    const otp = digits.join('');
    if (otp.length < OTP_LENGTH) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }
    if (!email) {
      setError('Email is missing. Please go back and try again.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOTP(email, otp);
    setLoading(false);

    if (result.success) {
      setSuccess('Email verified! Redirecting...');
      setTimeout(() => navigate('/welcome'), 1200);
    } else {
      setError(result.error || 'Verification failed.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [digits, email, verifyOTP, navigate]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (digits.every(d => d !== '') && !loading) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const handleResend = async () => {
    if (!email || secondsLeft > 0) return;
    setResending(true);
    setError('');
    setSuccess('');
    try {
      const response = await authAPI.resendOTP({ email });
      setSecondsLeft(OTP_EXPIRY_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      if (response.data?.devOTP) {
        const otpDigits = response.data.devOTP.toString().split('');
        setDigits(otpDigits);
        setSuccess(`[Dev Mode] A new code has been generated: ${response.data.devOTP}`);
      } else {
        setSuccess('A new code has been sent to your email.');
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.');
    }
    setResending(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left panel */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-logo">
              <Icons.Logo />
              <span className="auth-logo-text">FlowGrid</span>
            </div>
            <h1 className="auth-brand-title">One step away</h1>
            <p className="auth-brand-subtitle">
              We sent a 6-digit verification code to your email. Enter it within <strong>30 seconds</strong> to activate your account.
            </p>
            <div className="auth-features">
              <div className="auth-feature">
                <div className="auth-feature-icon"><Icons.Shield /></div>
                <div className="auth-feature-text">
                  <strong>Secure Verification</strong>
                  <span>OTP expires in 10 minutes</span>
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature-icon"><Icons.Mail /></div>
                <div className="auth-feature-text">
                  <strong>Check your inbox</strong>
                  <span>Also check your spam folder</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2 className="auth-form-title">Verify your email</h2>
              <p className="auth-form-subtitle">
                Enter the 6-digit code sent to{' '}
                <strong>{email || 'your email'}</strong>
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <Icons.AlertCircle />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="auth-error" style={{ background: '#f0fdf4', borderColor: '#22c55e', color: '#15803d' }}>
                <Icons.CheckCircle />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="auth-form">
              {/* Email override input (if state was missing) */}
              {!location.state?.email && (
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-wrapper">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter the email you registered with"
                      className="form-input"
                      required
                    />
                    <Icons.Mail className="input-icon" size={20} />
                  </div>
                </div>
              )}

              {/* 6-digit OTP inputs */}
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <div
                  style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '12px 0' }}
                  onPaste={handlePaste}
                >
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => (inputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      style={{
                        width: 48,
                        height: 56,
                        textAlign: 'center',
                        fontSize: 22,
                        fontWeight: 700,
                        border: `2px solid ${digit ? '#3b82f6' : '#d1d5db'}`,
                        borderRadius: 10,
                        outline: 'none',
                        background: digit ? '#eff6ff' : '#fff',
                        transition: 'border-color 0.15s, background 0.15s',
                        caretColor: 'transparent'
                      }}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                {/* Countdown */}
                <div style={{ textAlign: 'center', marginTop: 6 }}>
                  {secondsLeft > 0 ? (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      Code expires in{' '}
                      <span style={{ fontWeight: 600, color: secondsLeft < 60 ? '#ef4444' : '#374151' }}>
                        {formatTime(secondsLeft)}
                      </span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>
                      Code expired
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading || digits.join('').length < OTP_LENGTH}
              >
                {loading ? (
                  <><Icons.Loader className="btn-loader" /> Verifying…</>
                ) : (
                  'Verify Email'
                )}
              </button>
            </form>

            {/* Resend */}
            <div className="auth-divider"><span>didn't receive the code?</span></div>
            <button
              type="button"
              className="btn btn-secondary btn-lg btn-full"
              onClick={handleResend}
              disabled={secondsLeft > 0 || resending}
            >
              {resending
                ? <><Icons.Loader className="btn-loader" /> Sending…</>
                : secondsLeft > 0
                  ? `Resend in ${formatTime(secondsLeft)}`
                  : 'Resend Code'
              }
            </button>

            <div className="auth-footer" style={{ marginTop: 16 }}>
              <p>
                Wrong account?{' '}
                <Link to="/signup" className="auth-link">Sign up again</Link>
                {' · '}
                <Link to="/signin" className="auth-link">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
