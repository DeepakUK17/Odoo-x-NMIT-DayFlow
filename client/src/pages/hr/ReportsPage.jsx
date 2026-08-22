import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../../services/api';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const [trend, setTrend] = useState([]);
  const [deptAbs, setDeptAbs] = useState([]);
  const [leaveDist, setLeaveDist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      analyticsAPI.attendanceTrend(),
      analyticsAPI.departmentAbsenteeism(),
      analyticsAPI.leaveDistribution(),
    ]).then(([t, d, l]) => {
      if (t.status === 'fulfilled') setTrend(t.value.data);
      if (d.status === 'fulfilled') setDeptAbs(d.value.data);
      if (l.status === 'fulfilled') setLeaveDist(l.value.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Data-driven workforce insights</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Attendance Trend */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Attendance Trend (5 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--surface-3)', borderRadius: 8, fontSize: 11 }}
                formatter={v => [`${v}%`, 'Attendance']} />
              <Area type="monotone" dataKey="pct" stroke="#4f46e5" fill="url(#rGrad)" strokeWidth={2} dot={{ fill: '#4f46e5', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leave Distribution */}
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Leave Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={leaveDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                {leaveDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Dept Absenteeism */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: 20 }}>Department Absenteeism Rates</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptAbs} margin={{ left: 0 }}>
              <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--surface-3)', borderRadius: 8, fontSize: 11 }}
                formatter={v => [`${v}%`, 'Absenteeism Rate']} />
              <Bar dataKey="absentPct" radius={[6, 6, 0, 0]}>
                {deptAbs.map((entry, i) => <Cell key={i} fill={entry.absentPct > 15 ? '#ef4444' : entry.absentPct > 10 ? '#f59e0b' : '#4f46e5'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: 16 }}>Department Summary</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Department</th><th>Employees</th><th>Absent Days</th><th>Absenteeism Rate</th></tr></thead>
              <tbody>
                {deptAbs.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.department}</td>
                    <td>{d.employeeCount}</td>
                    <td>{d.absentDays}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, d.absentPct * 3)}%`, height: '100%', background: d.absentPct > 15 ? 'var(--danger)' : d.absentPct > 10 ? 'var(--warning)' : 'var(--success)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: d.absentPct > 15 ? 'var(--danger)' : d.absentPct > 10 ? 'var(--warning)' : 'var(--success)', width: 40 }}>{d.absentPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
