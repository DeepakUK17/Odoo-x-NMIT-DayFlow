import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

// Layout
import AppLayout from './components/layout/AppLayout';

// Employee Pages
import EmployeeDashboard from './pages/employee/DashboardPage';
import AttendancePage from './pages/employee/AttendancePage';
import LeavePage from './pages/employee/LeavePage';
import PassportPage from './pages/employee/PassportPage';
import PayrollPage from './pages/employee/PayrollPage';
import NotificationsPage from './pages/shared/NotificationsPage';

// HR Pages
import HRDashboard from './pages/hr/CommandCenterPage';
import HREmployeesPage from './pages/hr/EmployeesPage';
import HRAttendancePage from './pages/hr/AttendancePage';
import HRLeavePage from './pages/hr/LeavePage';
import HRPayrollPage from './pages/hr/PayrollPage';
import IntelligencePage from './pages/hr/IntelligencePage';
import ReportsPage from './pages/hr/ReportsPage';
import ActionCenterPage from './pages/hr/ActionCenterPage';
import AuditPage from './pages/hr/AuditPage';

import './index.css';

function ProtectedRoute({ children, requireHR = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-page"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireHR && user.role !== 'hr_admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-page"><div className="spinner spinner-lg" /></div>;
  if (user) return <Navigate to={user.role === 'hr_admin' ? '/hr' : '/dashboard'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Employee Routes */}
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="passport" element={<PassportPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* HR Routes */}
        <Route path="/hr" element={<ProtectedRoute requireHR><AppLayout /></ProtectedRoute>}>
          <Route index element={<HRDashboard />} />
          <Route path="employees" element={<HREmployeesPage />} />
          <Route path="attendance" element={<HRAttendancePage />} />
          <Route path="leave" element={<HRLeavePage />} />
          <Route path="payroll" element={<HRPayrollPage />} />
          <Route path="intelligence" element={<IntelligencePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="actions" element={<ActionCenterPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              border: '1px solid var(--surface-3)',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
            error: { iconTheme: { primary: 'var(--danger)', secondary: '#fff' } },
          }}
        />
      </SocketProvider>
    </AuthProvider>
  );
}
