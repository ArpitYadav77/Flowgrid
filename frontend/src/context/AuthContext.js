import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('flowgrid_token');
      if (token) {
        try {
          const response = await authAPI.me();
          setUser(response.data);
          setIsAuthenticated(true);
          setIsFirstLogin(response.data.isFirstLogin || false);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('flowgrid_token');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user, token, isFirstLogin: firstLogin } = response.data;
      
      localStorage.setItem('flowgrid_token', token);
      setUser(user);
      setIsAuthenticated(true);
      setIsFirstLogin(firstLogin);
      
      return { success: true, isFirstLogin: firstLogin, user };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  }, []);

  const signup = useCallback(async (userData) => {
    try {
      const response = await authAPI.signup(userData);
      const { user, token, isFirstLogin: firstLogin } = response.data;
      
      localStorage.setItem('flowgrid_token', token);
      setUser(user);
      setIsAuthenticated(true);
      setIsFirstLogin(firstLogin);
      
      return { success: true, isFirstLogin: firstLogin, user };
    } catch (error) {
      const message = error.response?.data?.error || 'Signup failed';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('flowgrid_token');
      setUser(null);
      setIsAuthenticated(false);
      setIsFirstLogin(false);
    }
  }, []);

  const completeFirstLogin = useCallback(async () => {
    try {
      await authAPI.completeFirstLogin();
      setIsFirstLogin(false);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'Update failed';
      return { success: false, error: message };
    }
  }, []);

  // Helper to check user role
  const isProvider = user?.role && user.role !== 'customer';
  const isCustomer = user?.role === 'customer';

  const getRoleDisplayName = (role) => {
    const roleNames = {
      customer: 'Customer',
      salon_owner: 'Salon Owner',
      tutor: 'Tutor',
      car_washer: 'Car Washer',
      service_provider: 'Service Provider'
    };
    return roleNames[role] || role;
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    isFirstLogin,
    isProvider,
    isCustomer,
    login,
    signup,
    logout,
    completeFirstLogin,
    updateProfile,
    getRoleDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
