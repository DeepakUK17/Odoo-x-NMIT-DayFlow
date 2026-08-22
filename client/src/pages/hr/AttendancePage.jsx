import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { attendanceAPI } from '../../services/api';
import { format } from 'date-fns';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLOR = { present: 'var(--success)', absent: 'var(--danger)', half_day: 'var(--warning)', on_leave: 'var(--info)', weekend: 'var(--text-muted)' };

export default function HRAttendancePage() {
  const [data, setData] = useState({ records: [], summary: {}, date: '' });
  const [anomalies, setAnomalies] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [attRes, anomRes] = await Promise.allSettled([
        attendanceAPI.getAll({ date: selectedDate }),
        attendanceAPI.getIntelligence(),
      ]);
      if (attRes.status === 'fulfilled') setData(attRes.value.data);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.data.anomalies || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [selectedDate]);

  const s = data.summary;

  return (
    <div className="animate-fadeIn">
      <div className="topbar">
        <div>
          <h1 className="page-title">Attendance Overview</h1>
          <p className="page-subtitle">Monitor team presence and patterns</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="date" className="form-input" style={{ width: 160 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Present', value: s.present || 0, color: 'var(--success)' },
          { label: 'Absent', value: s.absent || 0, color: 'var(--danger)' },
          { label: 'On Leave', value: s.onLeave || 0, color: 'var(--info)' },
          { label: 'Late', value: s.late || 0, color: 'var(--warning)' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[{ key: 'today', label: `Today's Log (${data.records.length})` }, { key: 'anomalies', label: `Anomalies (${anomalies.length})` }].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Employee</th><th>Department</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Flags</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                ) : data.records.map((r, i) => (
                  <motion.tr key={r.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.firstName} {r.lastName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.employeeCode}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{r.departmentName || '—'}</td>
                    <td><span className="badge" style={{ background: `${STATUS_COLOR[r.status]}22`, color: STATUS_COLOR[r.status] }}>{r.status?.replace('_', ' ')}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.checkInTime ? format(new Date(r.checkInTime), 'HH:mm') : '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.checkOutTime ? format(new Date(r.checkOutTime), 'HH:mm') : '—'}</td>
                    <td>{r.workHours ? `${parseFloat(r.workHours).toFixed(1)}h` : '—'}</td>
                    <td>
                      {r.isLate && <span className="badge badge-warning" style={{ marginRight: 4 }}>Late</span>}
                      {r.missingCheckout && <span className="badge badge-danger">⚠ Missing</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'anomalies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {anomalies.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">No anomalies detected</div><div className="empty-state-desc">All employees have healthy attendance patterns</div></div>
          ) : anomalies.map((a, i) => (
            <motion.div key={a.employeeId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card" style={{ border: `1px solid ${a.topSeverity === 'high' ? 'hsla(4,84%,58%,0.3)' : a.topSeverity === 'medium' ? 'hsla(38,92%,55%,0.3)' : 'var(--surface-3)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.employeeName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.employeeCode} · Attendance: <span style={{ color: a.attendancePct < 75 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>{a.attendancePct}%</span></div>
                </div>
                <span className={`badge ${a.topSeverity === 'high' ? 'badge-danger' : a.topSeverity === 'medium' ? 'badge-warning' : 'badge-muted'}`}>
                  {a.topSeverity} severity
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {a.issues.map((issue, j) => (
                  <div key={j} style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '6px 12px', fontSize: '0.78rem' }}>
                    <span style={{ color: issue.severity === 'high' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>⚠ {issue.type.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{issue.detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
