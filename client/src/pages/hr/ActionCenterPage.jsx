import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { attendanceAPI, leaveAPI } from '../../services/api';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export default function ActionCenterPage() {
  const [anomalies, setAnomalies] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const load = async () => {
    try {
      const [anomRes, leaveRes] = await Promise.allSettled([
        attendanceAPI.getIntelligence(),
        leaveAPI.getAll({ status: 'pending' }),
      ]);
      if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.data.anomalies || []);
      if (leaveRes.status === 'fulfilled') setPending(leaveRes.value.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const quickApprove = async (id) => {
    setActionLoading(a => ({ ...a, [id]: true }));
    try {
      await leaveAPI.approve(id, { comment: 'Approved via Action Center' });
      toast.success('Leave approved!');
      load();
    } catch (err) { toast.error('Failed'); }
    finally { setActionLoading(a => ({ ...a, [id]: false })); }
  };

  const quickReject = async (id) => {
    setActionLoading(a => ({ ...a, [id + 'r']: true }));
    try {
      await leaveAPI.reject(id, { comment: 'Rejected via Action Center' });
      toast.success('Leave rejected');
      load();
    } catch (err) { toast.error('Failed'); }
    finally { setActionLoading(a => ({ ...a, [id + 'r']: false })); }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Action Center</h1>
        <p className="page-subtitle">Everything that needs your attention, in one place</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Pending Leaves */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={18} style={{ color: 'var(--warning)' }} />
            <h3>Pending Leave Approvals ({pending.length})</h3>
          </div>
          {loading ? <div className="spinner" style={{ margin: 'auto' }} /> : pending.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
              <CheckCircle size={32} style={{ color: 'var(--success)', margin: '0 auto var(--sp-3)' }} />
              <div className="empty-state-title">All clear!</div>
              <div className="empty-state-desc">No pending requests</div>
            </div>
          ) : (
            pending.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{req.firstName} {req.lastName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {req.leaveTypeIcon} {req.leaveTypeName} · {format(parseISO(req.startDate), 'dd MMM')} → {format(parseISO(req.endDate), 'dd MMM')} ({req.daysCount}d)
                    </div>
                  </div>
                </div>
                {req.reason && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>"{req.reason}"</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm btn-full" onClick={() => quickApprove(req.id)} disabled={actionLoading[req.id]}>
                    {actionLoading[req.id] ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : '✓ Approve'}
                  </button>
                  <button className="btn btn-danger btn-sm btn-full" onClick={() => quickReject(req.id)} disabled={actionLoading[req.id + 'r']}>
                    {actionLoading[req.id + 'r'] ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : '✗ Reject'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Attendance Anomalies */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            <h3>Attendance Alerts ({anomalies.length})</h3>
          </div>
          {loading ? <div className="spinner" style={{ margin: 'auto' }} /> : anomalies.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
              <CheckCircle size={32} style={{ color: 'var(--success)', margin: '0 auto var(--sp-3)' }} />
              <div className="empty-state-title">No anomalies</div>
              <div className="empty-state-desc">Team attendance is healthy</div>
            </div>
          ) : (
            anomalies.map((a, i) => (
              <motion.div key={a.employeeId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)', marginBottom: 10, borderLeft: `3px solid ${a.topSeverity === 'high' ? 'var(--danger)' : 'var(--warning)'}` }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.employeeName}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Attendance: <strong style={{ color: a.attendancePct < 75 ? 'var(--danger)' : 'var(--warning)' }}>{a.attendancePct}%</strong>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {a.issues.map((issue, j) => (
                    <span key={j} className={`badge ${issue.severity === 'high' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                      {issue.action}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
