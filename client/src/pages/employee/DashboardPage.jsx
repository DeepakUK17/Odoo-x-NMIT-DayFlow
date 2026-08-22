import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { analyticsAPI, attendanceAPI, leaveAPI, notificationsAPI } from '../../services/api';
import { Clock, Calendar, TrendingUp, Bell, ChevronRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function StatCard({ icon, label, value, color, sub }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="kpi-card">
      <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: color || 'var(--text-primary)', fontSize: '1.8rem' }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </motion.div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { on, connected } = useSocket();
  const [stats, setStats] = useState(null);
  const [todayAtt, setTodayAtt] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const emp = user?.employee;
  const displayName = emp ? `${emp.firstName}` : 'there';

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, todayRes, balRes, notifRes, trendRes] = await Promise.allSettled([
          analyticsAPI.employeeStats(),
          attendanceAPI.getToday(),
          leaveAPI.getBalance(),
          notificationsAPI.getAll({ limit: 5 }),
          analyticsAPI.employeeStats(),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (todayRes.status === 'fulfilled') setTodayAtt(todayRes.value.data.record);
        if (balRes.status === 'fulfilled') setLeaveBalance(balRes.value.data.slice(0, 4));
        if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.notifications?.slice(0, 4) || []);
        if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.trend || []);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  // Real-time: listen for leave approved/rejected
  useEffect(() => {
    const off = on('leave:approved', (data) => {
      toast.success(data.message || 'Your leave was approved! 🎉');
    });
    const off2 = on('leave:rejected', () => {
      toast.error('Your leave request was not approved.');
    });
    return () => { off?.(); off2?.(); };
  }, [on]);

  const getAttStatus = () => {
    if (!todayAtt) return { label: 'Not Checked In', color: 'var(--text-muted)', icon: '🔴' };
    if (todayAtt.checkInTime && todayAtt.checkOutTime) return { label: 'Work Complete', color: 'var(--success)', icon: '✅' };
    if (todayAtt.checkInTime) return { label: 'Checked In', color: 'var(--success)', icon: '🟢' };
    return { label: 'Absent', color: 'var(--danger)', icon: '🔴' };
  };
  const attStatus = getAttStatus();

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--r-lg)' }} />)}
    </div>
  );

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="topbar">
        <div>
          <h1 className="page-title">{greeting}, {displayName} 👋</h1>
          <p className="page-subtitle">
            {format(now, 'EEEE, MMMM d, yyyy')} ·{' '}
            <span style={{ color: attStatus.color, fontWeight: 600 }}>{attStatus.label === 'Checked In' ? '●' : '○'} {attStatus.label}</span>
          </p>
        </div>
        <div className="topbar-actions">
          <Link to="/leave" className="btn btn-primary btn-sm">+ Apply Leave</Link>
          <Link to="/notifications" style={{ textDecoration: 'none' }}>
            <div className="notif-bell"><Bell size={17} /></div>
          </Link>
        </div>
      </div>

      {/* Today Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          background: `linear-gradient(135deg, hsla(235,85%,62%,0.12), hsla(270,70%,65%,0.08))`,
          border: '1px solid hsla(235,85%,62%,0.2)',
          marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '2.2rem' }}>{attStatus.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{attStatus.label}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {todayAtt?.checkInTime ? `Checked in at ${format(new Date(todayAtt.checkInTime), 'hh:mm a')}` : 'Your attendance for today'}
              {todayAtt?.isLate && <span className="badge badge-warning" style={{ marginLeft: 8 }}>Late</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!todayAtt?.checkInTime && (
            <Link to="/attendance" className="btn btn-primary btn-sm">Check In Now <ChevronRight size={14} /></Link>
          )}
          {todayAtt?.checkInTime && !todayAtt?.checkOutTime && (
            <Link to="/attendance" className="btn btn-secondary btn-sm">Check Out <ChevronRight size={14} /></Link>
          )}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon="📊" label="Attendance Rate" value={`${stats?.attendancePct || 0}%`}
          color={stats?.attendancePct >= 80 ? 'var(--success)' : 'var(--danger)'} sub="This period" />
        <StatCard icon="✅" label="Days Present" value={stats?.present || 0} sub="Total workdays" />
        <StatCard icon="🏖" label="Leave Remaining" value={leaveBalance.find(b => b.leaveTypeName === 'Casual Leave')?.remaining ?? '—'} sub="Casual leaves" />
        <StatCard icon="⏰" label="Late Check-ins" value={stats?.lateCount || 0} color={stats?.lateCount > 2 ? 'var(--warning)' : undefined} sub="This period" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Leave Balance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem' }}>Leave Balance</h3>
            <Link to="/leave" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)' }}>Manage →</Link>
          </div>
          {leaveBalance.map(b => (
            <div key={b.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                <span>{b.leaveTypeIcon} {b.leaveTypeName}</span>
                <span style={{ fontWeight: 700, color: b.remaining > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{b.remaining}/{b.total}</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.remaining / b.total) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: b.leaveTypeColor || 'var(--brand-primary)', borderRadius: 99 }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Attendance Trend */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem' }}>Attendance Trend</h3>
            <Link to="/attendance" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)' }}>Full history →</Link>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(235,85%,62%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(235,85%,62%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="pct" stroke="hsl(235,85%,62%)" fill="url(#attGrad)" strokeWidth={2} dot={false} />
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v}%`, 'Attendance']} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
            {trend.map(t => (
              <div key={t.week} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: t.pct >= 80 ? 'var(--success)' : 'var(--warning)' }}>{t.pct}%</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t.week}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem' }}>Recent Notifications</h3>
            <Link to="/notifications" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)' }}>View all →</Link>
          </div>
          {notifications.map(n => (
            <div key={n.id} className={`notif-item ${!n.isRead ? 'unread' : ''}`} style={{ borderBottom: '1px solid var(--surface-2)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{n.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
