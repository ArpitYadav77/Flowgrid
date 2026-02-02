import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import * as Icons from '../components/Icons';

const Settings = () => {
  const { user, logout, updateProfile } = useAuth();
  const { showNotification } = useNotification();

  // Profile Settings State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profilePhoto: null
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    bookingConfirmations: true,
    statusUpdates: true,
    paymentConfirmations: true,
    promotionalEmails: false,
    emailNotifications: true
  });

  // App Preferences State
  const [appPreferences, setAppPreferences] = useState({
    theme: localStorage.getItem('theme') || 'light',
    language: 'en',
    timezone: 'Asia/Kolkata'
  });

  // Delete Account Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        profilePhoto: null
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileData(prev => ({ ...prev, profilePhoto: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async () => {
    try {
      // In a real app, you'd upload the photo and update profile via API
      showNotification('Profile updated successfully', 'success');
    } catch (error) {
      showNotification('Failed to update profile', 'error');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordSave = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      // In a real app, call API to change password
      showNotification('Password changed successfully', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showNotification('Failed to change password', 'error');
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      showNotification('Logged out from all devices', 'success');
      setTimeout(() => logout(), 1500);
    } catch (error) {
      showNotification('Failed to logout from all devices', 'error');
    }
  };

  const handleNotificationToggle = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    showNotification('Notification preferences updated', 'success');
  };

  const handleThemeChange = (theme) => {
    setAppPreferences(prev => ({ ...prev, theme }));
    localStorage.setItem('theme', theme);
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    showNotification(`${theme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showNotification('Please type DELETE to confirm', 'error');
      return;
    }
    try {
      // In a real app, call API to delete account
      showNotification('Account deleted successfully', 'success');
      setTimeout(() => logout(), 2000);
    } catch (error) {
      showNotification('Failed to delete account', 'error');
    }
  };

  const getRoleDisplayName = (role) => {
    const roles = {
      customer: 'Customer',
      provider: 'Service Provider',
      admin: 'Administrator'
    };
    return roles[role] || role;
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      customer: 'Book and manage service appointments',
      provider: 'Offer services and manage bookings',
      admin: 'System administration and oversight'
    };
    return descriptions[role] || '';
  };

  const getLastLoginInfo = () => {
    // Mock data - in real app, fetch from backend
    return new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getJWTExpiry = () => {
    // Mock data - in real app, decode JWT token
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    return expiryDate.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="settings-content">
        {/* 1. Profile Settings */}
        <div className="settings-section">
          <div className="section-header">
            <h2><Icons.User /> Profile Settings</h2>
            <p>Update your personal information</p>
          </div>
          <div className="section-body">
            <div className="profile-photo-section">
              <div className="photo-preview">
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Profile" />
                ) : (
                  <div className="photo-placeholder">
                    <Icons.User />
                  </div>
                )}
              </div>
              <div className="photo-upload">
                <label htmlFor="photoUpload" className="btn btn-secondary">
                  <Icons.Upload /> Upload Photo
                </label>
                <input
                  type="file"
                  id="photoUpload"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
                <p className="upload-hint">JPG, PNG or GIF. Max size 2MB</p>
              </div>
            </div>

            <div className="form-group">
              <label>
                <Icons.User /> Full Name
              </label>
              <input
                type="text"
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>
                <Icons.Mail /> Email Address
              </label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                readOnly
                className="readonly-input"
              />
              <small className="input-hint">Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label>
                <Icons.Phone /> Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleProfileChange}
                placeholder="Enter your phone number"
              />
            </div>

            <button className="btn btn-primary" onClick={handleProfileSave}>
              <Icons.Save /> Save Changes
            </button>
          </div>
        </div>

        {/* 2. Password & Security */}
        <div className="settings-section">
          <div className="section-header">
            <h2><Icons.Lock /> Password & Security</h2>
            <p>Manage your password and security settings</p>
          </div>
          <div className="section-body">
            <div className="form-group">
              <label>Current Password</label>
              <div className="password-input-group">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-group">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input-group">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handlePasswordSave}>
              <Icons.Lock /> Change Password
            </button>

            <div className="security-info">
              <div className="info-item">
                <span className="info-label">Last Login:</span>
                <span className="info-value">{getLastLoginInfo()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Session Expires:</span>
                <span className="info-value">{getJWTExpiry()}</span>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={handleLogoutAllDevices}>
              <Icons.LogOut /> Logout from All Devices
            </button>
          </div>
        </div>

        {/* 3. Role / Account Type */}
        <div className="settings-section">
          <div className="section-header">
            <h2><Icons.Shield /> Account Type</h2>
            <p>Your role and permissions</p>
          </div>
          <div className="section-body">
            <div className="role-display">
              <div className="role-badge">
                <Icons.Shield />
                <span>{getRoleDisplayName(user?.role)}</span>
              </div>
              <p className="role-description">{getRoleDescription(user?.role)}</p>
            </div>

            <div className="info-box info-box-blue">
              <Icons.Info />
              <div>
                <strong>Current Role: {getRoleDisplayName(user?.role)}</strong>
                <p>Contact support to change your account type</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Notification Preferences */}
        <div className="settings-section">
          <div className="section-header">
            <h2><Icons.Bell /> Notification Preferences</h2>
            <p>Choose what notifications you want to receive</p>
          </div>
          <div className="section-body">
            <div className="toggle-list">
              <div className="toggle-item">
                <div className="toggle-info">
                  <Icons.Mail />
                  <div>
                    <h4>Email Notifications</h4>
                    <p>Receive notifications via email</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={() => handleNotificationToggle('emailNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <Icons.Calendar />
                  <div>
                    <h4>Booking Confirmations</h4>
                    <p>Get notified when bookings are confirmed</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications.bookingConfirmations}
                    onChange={() => handleNotificationToggle('bookingConfirmations')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <Icons.Bell />
                  <div>
                    <h4>Status Updates</h4>
                    <p>Notifications about booking status changes</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications.statusUpdates}
                    onChange={() => handleNotificationToggle('statusUpdates')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <Icons.CreditCard />
                  <div>
                    <h4>Payment Confirmations</h4>
                    <p>Alerts for successful payments</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications.paymentConfirmations}
                    onChange={() => handleNotificationToggle('paymentConfirmations')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <Icons.TrendingUp />
                  <div>
                    <h4>Promotional Emails</h4>
                    <p>Offers, news and product updates</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications.promotionalEmails}
                    onChange={() => handleNotificationToggle('promotionalEmails')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Payment Preferences */}
        <div className="settings-section">
          <div className="section-header">
            <h2><Icons.CreditCard /> Payment Preferences</h2>
            <p>Manage payment methods and billing</p>
          </div>
          <div className="section-body">
            <div className="payment-methods">
              <div className="payment-method-item">
                <div className="payment-method-icon">
                  <Icons.CreditCard />
                </div>
                <div className="payment-method-info">
                  <h4>Default Payment Method</h4>
                  <p>Razorpay (UPI, Cards, Net Banking)</p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Billing Email</label>
              <input
                type="email"
                value={profileData.email}
                readOnly
                className="readonly-input"
              />
            </div>

            <button className="btn btn-secondary">
              <Icons.Download /> Download All Invoices
            </button>
          </div>
        </div>

        {/* 6. App Preferences */}
        <div className="settings-section">
          <div className="section-header">
            <h2><Icons.SettingsGear /> App Preferences</h2>
            <p>Customize your experience</p>
          </div>
          <div className="section-body">
            <div className="form-group">
              <label>
                <Icons.Sun /> Theme
              </label>
              <div className="theme-options">
                <button
                  className={`theme-option ${appPreferences.theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  <Icons.Sun />
                  Light
                </button>
                <button
                  className={`theme-option ${appPreferences.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <Icons.Moon />
                  Dark
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>
                <Icons.Globe /> Language
              </label>
              <select
                value={appPreferences.language}
                onChange={(e) => setAppPreferences(prev => ({ ...prev, language: e.target.value }))}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="es">Español (Spanish)</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                <Icons.Clock /> Timezone
              </label>
              <select
                value={appPreferences.timezone}
                onChange={(e) => setAppPreferences(prev => ({ ...prev, timezone: e.target.value }))}
              >
                <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                <option value="America/New_York">EST (America/New_York)</option>
                <option value="Europe/London">GMT (Europe/London)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 7. Danger Zone */}
        <div className="settings-section danger-zone">
          <div className="section-header">
            <h2><Icons.AlertTriangle /> Danger Zone</h2>
            <p>Irreversible actions</p>
          </div>
          <div className="section-body">
            <div className="danger-action">
              <div className="danger-action-info">
                <h4>Logout from This Device</h4>
                <p>You will need to sign in again</p>
              </div>
              <button className="btn btn-secondary" onClick={logout}>
                <Icons.LogOut /> Logout
              </button>
            </div>

            <div className="danger-action">
              <div className="danger-action-info">
                <h4>Delete Account</h4>
                <p>Permanently delete your account and all data</p>
              </div>
              <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                <Icons.Trash /> Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Icons.AlertTriangle /> Delete Account</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <Icons.X />
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <Icons.AlertTriangle />
                <div>
                  <strong>Warning: This action cannot be undone!</strong>
                  <p>All your data, bookings, and payment history will be permanently deleted.</p>
                </div>
              </div>
              <div className="form-group">
                <label>Type <strong>DELETE</strong> to confirm:</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                <Icons.Trash /> Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
