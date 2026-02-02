import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import HeroPage from './pages/HeroPage';
import HelpCenter from './pages/HelpCenter';
import Settings from './pages/Settings';
import { NotificationProvider } from './context/NotificationContext';
import { UserProvider } from './context/UserContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner-large"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
};

// First Login Route - redirects to hero page
const FirstLoginRoute = ({ children }) => {
  const { isAuthenticated, isFirstLogin, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (isFirstLogin) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
};

// Auth Route - redirects to dashboard if already logged in
const AuthRoute = ({ children }) => {
  const { isAuthenticated, isFirstLogin, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    if (isFirstLogin) {
      return <Navigate to="/welcome" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Dashboard wrapper with layout
const DashboardLayout = () => {
  const { user, isProvider } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const renderContent = () => {
    if (currentView === 'help') {
      return <HelpCenter />;
    }
    
    if (currentView === 'settings') {
      return <Settings />;
    }
    
    if (isProvider) {
      // Map sidebar views to provider dashboard tabs
      const providerTabMap = {
        'dashboard': 'overview',
        'services': 'services',
        'bookings': 'bookings',
        'payments': 'payments'
      };
      const activeTab = providerTabMap[currentView] || 'overview';
      return <ProviderDashboard activeTab={activeTab} onTabChange={handleViewChange} />;
    }
    
    // For customers, map view to activeView prop
    const viewMap = {
      'browse': 'browse',
      'bookings': 'bookings',
      'payments': 'payments'
    };
    const customerView = viewMap[currentView] || 'browse';
    return <CustomerDashboard activeView={customerView} />;
  };

  return (
    <div className="app-container">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onViewChange={handleViewChange}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopBar onMobileMenuToggle={toggleMobileMenu} onViewChange={handleViewChange} />
        {renderContent()}
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <NotificationProvider>
            <Routes>
              {/* Public routes */}
              <Route 
                path="/signin" 
                element={
                  <AuthRoute>
                    <SignIn />
                  </AuthRoute>
                } 
              />
              <Route 
                path="/signup" 
                element={
                  <AuthRoute>
                    <SignUp />
                  </AuthRoute>
                } 
              />
              
              {/* First login hero page */}
              <Route 
                path="/welcome" 
                element={
                  <ProtectedRoute>
                    <HeroPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Protected dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <FirstLoginRoute>
                      <DashboardLayout />
                    </FirstLoginRoute>
                  </ProtectedRoute>
                } 
              />
              
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/signin" replace />} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
          </NotificationProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
