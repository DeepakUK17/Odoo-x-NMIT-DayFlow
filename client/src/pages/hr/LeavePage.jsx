import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaveAPI } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { Check, X, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLS = { pending: 'Pending', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected' };
const STATUS_COLORS = { pending: '#f59e0b', under_review: 'var(--info)', approved: 'var(--success)', rejected: 'var(--danger)' };

export default function HRLeavePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = () => {
    leaveAPI.getAll()
      .then(r => setRequests(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await leaveAPI.approve(selectedReq.id, { comment });
      toast.success('Leave approved!');
      setSelectedReq(null);
      setComment('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await leaveAPI.reject(selectedReq.id, { comment });
      toast.success('Leave rejected');
      setSelectedReq(null);
      setComment('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setActionLoading(false); }
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const groups = { pending: [], under_review: [], approved: [], rejected: [] };
  requests.forEach(r => { if (groups[r.status]) groups[r.status].push(r); });

  return (
    <div className="animate-fadeIn">
      <div className="topbar">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">{groups.pending.length} pending review{groups.pending.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)} {f !== 'all' && `(${groups[f]?.length || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {Object.entries(STATUS_COLS).map(([status, label]) => (
          <div key={status} className="kanban-col">
            <div className="kanban-col-header">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], flexShrink: 0 }} />
              {label}
              <span className="nav-badge" style={{ background: 'var(--surface-4)', color: 'var(--text-muted)', marginLeft: 'auto' }}>{groups[status]?.length || 0}</span>
            </div>

            {loading ? (
              [...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--r-md)', marginBottom: 12 }} />)
            ) : (groups[status] || []).map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="kanban-card" onClick={() => setSelectedReq(req)}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: '1.1rem' }}>{req.leaveTypeIcon || '📅'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{req.firstName} {req.lastName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.leaveTypeName}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  {format(parseISO(req.startDate), 'dd MMM')} → {format(parseISO(req.endDate), 'dd MMM')} · <strong style={{ color: 'var(--text-primary)' }}>{req.daysCount}d</strong>
                </div>
                {req.reason && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.reason}</div>}
                {status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); setSelectedReq(req); }}>Review</button>
                  </div>
                )}
              </motion.div>
            ))}
            {!loading && (groups[status] || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Empty</div>
            )}
          </div>
        ))}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedReq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay"
            onClick={e => e.target === e.currentTarget && setSelectedReq(null)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }} className="modal">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3>Leave Request</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedReq(null)}><X size={18} /></button>
              </div>

              <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-5)', marginBottom: 16 }}>
                {[
                  { label: 'Employee', value: `${selectedReq.firstName} ${selectedReq.lastName}` },
                  { label: 'Leave Type', value: selectedReq.leaveTypeName },
                  { label: 'Period', value: `${format(parseISO(selectedReq.startDate), 'dd MMM')} → ${format(parseISO(selectedReq.endDate), 'dd MMM yyyy')}` },
                  { label: 'Days', value: `${selectedReq.daysCount} working day${selectedReq.daysCount > 1 ? 's' : ''}` },
                  { label: 'Reason', value: selectedReq.reason || 'Not specified' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--surface-3)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', width: 100, flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {selectedReq.status === 'pending' && (
                <>
                  <div className="form-group">
                    <label className="form-label"><MessageSquare size={12} /> HR Comment (optional)</label>
                    <textarea className="form-input" rows={3} value={comment} onChange={e => setComment(e.target.value)}
                      placeholder="Add a note for the employee..." />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-danger btn-full" onClick={handleReject} disabled={actionLoading}>
                      {actionLoading ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : <><X size={14} /> Reject</>}
                    </button>
                    <button className="btn btn-success btn-full" onClick={handleApprove} disabled={actionLoading}>
                      {actionLoading ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : <><Check size={14} /> Approve</>}
                    </button>
                  </div>
                </>
              )}
              {selectedReq.status !== 'pending' && (
                <div style={{ textAlign: 'center', padding: 'var(--sp-4)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  This request was already <strong style={{ color: selectedReq.status === 'approved' ? 'var(--success)' : 'var(--danger)' }}>{selectedReq.status}</strong>.
                  {selectedReq.hrComment && <div style={{ marginTop: 8, fontStyle: 'italic' }}>HR: "{selectedReq.hrComment}"</div>}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
