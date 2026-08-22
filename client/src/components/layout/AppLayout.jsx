import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import NotificationBell from '../notifications/NotificationBell';
import {
  Home, Clock, Calendar, CreditCard, Bell, User, LogOut,
  Building2, Users, Brain, BarChart3, Zap, Activity, ChevronLeft, ChevronRight
} from 'lucide-react';

const employeeNav = [
  { label: 'My Desk', icon: <Home size={18} />, path: '/dashboard' },
  { label: 'Attendance', icon: <Clock size={18} />, path: '/attendance' },
  { label: 'Leave', icon: <Calendar size={18} />, path: '/leave' },
  { label: 'My Passport', icon: <User size={18} />, path: '/passport' },
  { label: 'Payroll', icon: <CreditCard size={18} />, path: '/payroll' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/notifications', badge: true },
];

const hrNav = [
  { label: 'Dayflow HQ', icon: <Building2 size={18} />, path: '/hr' },
  { label: 'Employees', icon: <Users size={18} />, path: '/hr/employees' },
  { label: 'Attendance', icon: <Clock size={18} />, path: '/hr/attendance' },
  { label: 'Leave', icon: <Calendar size={18} />, path: '/hr/leave' },
  { label: 'Payroll', icon: <CreditCard size={18} />, path: '/hr/payroll' },
  { label: 'Intelligence', icon: <Brain size={18} />, path: '/hr/intelligence' },
  { label: 'Reports', icon: <BarChart3 size={18} />, path: '/hr/reports' },
  { label: 'Action Center', icon: <Zap size={18} />, path: '/hr/actions' },
  { label: 'Activity Log', icon: <Activity size={18} />, path: '/hr/audit' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/hr/notifications', badge: true },
];

function getInitials(user) {
  const emp = user?.employee;
  if (emp?.firstName) return `${emp.firstName[0]}${emp.lastName?.[0] || ''}`.toUpperCase();
  return user?.email?.[0]?.toUpperCase() || 'U';
}

export default function AppLayout() {
  const { user, logout, isHR } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const nav = isHR ? hrNav : employeeNav;
  const displayName = user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-layout">
      {/* Sidebar */}
      <aside className="sidebar" style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
        {/* Logo */}
        <div className="sidebar-logo">
          {!collapsed ? (
            <>
              <div className="sidebar-brand">DAYFLOW</div>
              <div className="sidebar-tagline">The Human Operating System</div>
              <div className="dayflow-pulse" style={{ marginTop: '10px' }} />
            </>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 900, background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>D</div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {!collapsed && <div className="sidebar-section-label">{isHR ? 'HR Operations' : 'My Workspace'}</div>}
          {nav.map((item) => {
            const isActive = item.path === '/hr'
              ? location.pathname === '/hr'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                end={item.path === '/hr'}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && <NotificationBadge />}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Connection status */}
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.7rem', color: connected ? 'var(--success)' : 'var(--text-muted)' }}>
              <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
              {connected ? 'Live' : 'Offline'}
            </div>
          )}

          {/* User info */}
          <div className="sidebar-user" onClick={handleLogout} title="Click to log out">
            <div className="avatar avatar-sm">{getInitials(user)}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div className="sidebar-user-role">{isHR ? 'HR Admin' : 'Employee'}</div>
              </div>
            )}
            {!collapsed && <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', marginTop: 8, justifyContent: collapsed ? 'center' : 'flex-end' }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="page-content" style={{ marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
        <Outlet />
      </main>
    </div>
  );
}

function NotificationBadge() {
  const [count] = React.useState(0); // Will be driven by context in a real impl
  if (!count) return null;
  return <span className="nav-badge">{count}</span>;
}
