import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI, aiAPI, attendanceAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, Clock, Calendar, CreditCard, Zap, TrendingUp, AlertTriangle, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#f59e0b', '#10b981', '#ef4444'];

function KPICard({ icon, label, value, sub, color, trend }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ background: `${color}22`, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {trend !== undefined && <div className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</div>}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub" style={{ marginTop: 4 }}>{sub}</div>}
    </motion.div>
  );
}

export default function CommandCenterPage() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [leaveDist, setLeaveDist] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quickAiQ, setQuickAiQ] = useState('');
  const [quickAiRes, setQuickAiRes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const { on, connected } = useSocket();

  const load = async () => {
    try {
      const [sumRes, trendRes, leaveRes, insRes] = await Promise.allSettled([
        analyticsAPI.hrSummary(),
        analyticsAPI.attendanceTrend(),
        analyticsAPI.leaveDistribution(),
        aiAPI.proactiveInsights(),
      ]);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data);
      if (leaveRes.status === 'fulfilled') setLeaveDist(leaveRes.value.data);
      if (insRes.status === 'fulfilled') setInsights(insRes.value.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Real-time refresh on socket events
  useEffect(() => {
    const off = on('dashboard:refresh', () => { load(); toast.success('Dashboard updated!', { duration: 2000 }); });
    const off2 = on('attendance:check-in', (data) => {
      toast(`${data.employeeName} checked in ${data.isLate ? '(late)' : ''}`, { icon: '🟢', duration: 3000 });
      setSummary(prev => prev ? { ...prev, present: (prev.present || 0) + 1 } : prev);
    });
    const off3 = on('leave:submitted', (data) => {
      toast(`${data.employeeName} submitted a leave request`, { icon: '📋', duration: 3000 });
    });
    return () => { off?.(); off2?.(); off3?.(); };
  }, [on]);

  const handleQuickAI = async (e) => {
    e.preventDefault();
    if (!quickAiQ.trim()) return;
    setAiLoading(true);
    setQuickAiRes('');
    try {
      const res = await aiAPI.query(quickAiQ);
      setQuickAiRes(res.data.response);
    } catch (err) {
      setQuickAiRes('AI service unavailable. Check API key configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="topbar">
        <div>
          <h1 className="page-title">Dayflow HQ</h1>
          <p className="page-subtitle">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} ·{' '}
            {connected ? <span style={{ color: 'var(--success)' }}>● System Online</span> : <span style={{ color: 'var(--text-muted)' }}>○ Offline</span>}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <KPICard icon={<Users size={18} />} label="Total Employees" value={summary?.totalEmployees || 0} color="hsl(235,85%,62%)" />
          <KPICard icon={<Clock size={18} />} label="Present Today" value={`${summary?.present || 0}/${summary?.totalEmployees || 0}`}
            sub={`${summary?.attendancePct || 0}% attendance`} color={summary?.attendancePct >= 80 ? 'var(--success)' : 'var(--danger)'}
            trend={summary?.attendancePct - 80} />
          <KPICard icon={<Calendar size={18} />} label="Pending Leaves" value={summary?.pendingLeaves || 0}
            color={summary?.pendingLeaves > 0 ? 'var(--warning)' : 'var(--success)'}
            sub={summary?.onLeave ? `${summary.onLeave} on leave today` : undefined} />
          <KPICard icon={<CreditCard size={18} />} label="Monthly Payroll" value={fmt(summary?.totalPayroll)} color="var(--success)" />
        </div>
      )}

      {/* Alert Row */}
      {insights && (insights.missingCheckout > 0 || insights.anomalies > 0) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {insights.missingCheckout > 0 && (
            <div style={{ flex: 1, minWidth: 200, background: 'var(--warning-light)', border: '1px solid hsla(38,92%,55%,0.3)', borderRadius: 'var(--r-md)', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem', color: 'var(--warning)' }}>
              <AlertTriangle size={16} /> {insights.missingCheckout} employee{insights.missingCheckout > 1 ? 's' : ''} with missing checkout
            </div>
          )}
          {insights.anomalies > 0 && (
            <div style={{ flex: 1, minWidth: 200, background: 'var(--danger-light)', border: '1px solid hsla(4,84%,58%,0.3)', borderRadius: 'var(--r-md)', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.85rem', color: 'var(--danger)' }}>
              <AlertTriangle size={16} /> {insights.anomalies} attendance anomalies detected
            </div>
          )}
        </motion.div>
      )}

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Attendance Trend */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Attendance Trend (Last 5 Days)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(235,85%,62%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(235,85%,62%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--surface-3)', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v}%`, 'Attendance']} />
              <Area type="monotone" dataKey="pct" stroke="hsl(235,85%,62%)" fill="url(#trendGrad)" strokeWidth={2} dot={{ fill: 'hsl(235,85%,62%)', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leave Distribution */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Leave Distribution</h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={leaveDist} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                {leaveDist.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {leaveDist.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
                {d.status}: {d.count}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick AI Panel */}
      <div className="card" style={{ background: 'linear-gradient(135deg, hsla(235,85%,62%,0.08), hsla(270,70%,65%,0.05))', border: '1px solid hsla(235,85%,62%,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Brain size={18} style={{ color: 'var(--brand-primary)' }} />
          <h3 style={{ fontSize: '1rem' }}>Quick AI Query</h3>
          <span style={{ fontSize: '0.7rem', background: 'hsla(235,85%,62%,0.15)', color: 'var(--brand-primary)', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>BETA</span>
        </div>
        <form onSubmit={handleQuickAI} style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input" style={{ flex: 1 }}
            value={quickAiQ} onChange={e => setQuickAiQ(e.target.value)}
            placeholder='Ask anything — "Who has low attendance?" or "Show pending leaves"'
          />
          <button type="submit" className="btn btn-primary" disabled={aiLoading || !quickAiQ.trim()}>
            {aiLoading ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : 'Ask'}
          </button>
        </form>
        {quickAiRes && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 12, padding: 'var(--sp-4)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {quickAiRes}
          </motion.div>
        )}
      </div>
    </div>
  );
}
