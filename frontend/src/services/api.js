import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('flowgrid_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('flowgrid_token');
      if (window.location.pathname !== '/signin' && window.location.pathname !== '/signup') {
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  completeFirstLogin: () => api.post('/auth/complete-first-login'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: (period) => api.get('/dashboard/stats', { params: { period } }),
  getCalendar: (month, year) => api.get('/dashboard/calendar', { params: { month, year } }),
  getSummary: () => api.get('/dashboard/summary'),
};

// Services API
export const servicesAPI = {
  getAll: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
  updateStatus: (id, status) => api.patch(`/services/${id}/status`, { status }),
};

// Bookings API
export const bookingsAPI = {
  getAll: (params) => api.get('/bookings', { params }),
  getToday: () => api.get('/bookings/today'),
  getById: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  update: (id, data) => api.put(`/bookings/${id}`, data),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
  cancel: (id) => api.delete(`/bookings/${id}`),
};

// Payments API
export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  refund: (id) => api.post(`/payments/${id}/refund`),
  exportCSV: (params) => api.get('/payments/export/csv', { params, responseType: 'blob' }),
};

// Users API
export const usersAPI = {
  getCurrentUser: () => api.get('/users/me'),
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
};

// Slots API (Real booking system)
export const slotsAPI = {
  // Services
  getServices: (params) => api.get('/slots/services', { params }),
  getServiceById: (id) => api.get(`/slots/services/${id}`),
  
  // Slots
  getAvailableSlots: (params) => api.get('/slots/available', { params }),
  
  // Bookings
  bookSlot: (data) => api.post('/slots/book', data),
  confirmBooking: (bookingId, data) => api.post(`/slots/confirm/${bookingId}`, data),
  cancelBooking: (bookingId, data) => api.post(`/slots/cancel/${bookingId}`, data),
  getBookings: (params) => api.get('/slots/bookings', { params }),
  
  // Provider
  getProviderSchedule: (params) => api.get('/slots/provider/schedule', { params }),
  getProviderStats: () => api.get('/slots/provider/stats'),
  createService: (data) => api.post('/slots/provider/service', data),
  updateService: (id, data) => api.put(`/slots/provider/service/${id}`, data),
  deleteService: (id) => api.delete(`/slots/provider/service/${id}`),
  createSlots: (data) => api.post('/slots/provider/slots', data),
};

// Razorpay API
export const razorpayAPI = {
  createOrder: (data) => api.post('/razorpay/create-order', data),
  verifyPayment: (data) => api.post('/razorpay/verify-payment', data),
  getOrders: () => api.get('/razorpay/orders'),
  getPayments: () => api.get('/razorpay/payments'),
  refund: (paymentId, data) => api.post(`/razorpay/refund/${paymentId}`, data),
  getKey: () => api.get('/razorpay/key'),
  createQr: (data) => api.post('/razorpay/create-qr', data),
  verifyQrPayment: (data) => api.post('/razorpay/verify-qr-payment', data),
};

// Unsplash API
export const unsplashAPI = {
  search: (query, perPage = 10) => api.get('/unsplash/search', { params: { query, perPage } }),
  getRandom: (query) => api.get('/unsplash/random', { params: { query } }),
  getServiceImages: () => api.get('/unsplash/service-images'),
};

export default api;
