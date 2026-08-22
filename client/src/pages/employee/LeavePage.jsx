import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { leaveAPI, aiAPI } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { Sparkles, Calendar, ChevronRight, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  pending: { class: 'badge-warning', label: '🕐 Pending' },
  approved: { class: 'badge-success', label: '✅ Approved' },
  rejected: { class: 'badge-danger', label: '❌ Rejected' },
  under_review: { class: 'badge-info', label: '🔍 Under Review' },
};

export default function LeavePage() {
  const [balance, setBalance] = useState([]);
  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [step, setStep] = useState(1);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });

  const loadData = async () => {
    try {
      const [balRes, reqRes, typRes] = await Promise.allSettled([
        leaveAPI.getBalance(), leaveAPI.getMyRequests(), leaveAPI.getTypes()
      ]);
      if (balRes.status === 'fulfilled') setBalance(balRes.value.data);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data);
      if (typRes.status === 'fulfilled') setTypes(typRes.value.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAiAssist = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await aiAPI.leaveAssist(aiInput);
      const { leaveType, startDate, endDate, reason, suggestion } = res.data;
      const matchedType = types.find(t => t.name === leaveType);
      setForm({
        leaveTypeId: matchedType?.id || '',
        startDate: startDate || '',
        endDate: endDate || '',
        reason: reason || '',
      });
      toast.success(suggestion || 'Leave details extracted from your message!');
      setStep(2);
    } catch (err) {
      toast.error('AI assistant failed. Please fill in manually.');
      setStep(2);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApply = async () => {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error('Please fill all required fields');
      return;
    }
    setApplyLoading(true);
    try {
      await leaveAPI.apply(form);
      toast.success('Leave request submitted! HR will review it soon.');
      setShowApply(false);
      setStep(1);
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      setAiInput('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setApplyLoading(false);
    }
  };

  const totalRemaining = balance.reduce((s, b) => s + b.remaining, 0);

  return (
    <div className="animate-fadeIn">
      <div className="topbar">
        <div>
          <h1 className="page-title">Leave</h1>
          <p className="page-subtitle">Manage your time off with AI assistance</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowApply(true); setStep(1); }}>
          <Sparkles size={15} /> Apply with AI
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {balance.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card" style={{ borderTop: `3px solid ${b.leaveTypeColor}`, cursor: 'default' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{b.leaveTypeIcon}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.leaveTypeName}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, margin: '6px 0 10px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: b.remaining > 0 ? 'var(--text-primary)' : 'var(--danger)', lineHeight: 1 }}>{b.remaining}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>/ {b.total} days left</span>
            </div>
            <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${(b.remaining / b.total) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.08 }}
                style={{ height: '100%', background: b.leaveTypeColor, borderRadius: 99 }} />
            </div>
            <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.used} used</div>
          </motion.div>
        ))}
      </div>

      {/* Leave Requests */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>My Leave History</h3>
        {requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No leave requests yet</div>
            <div className="empty-state-desc">Apply for leave using the button above</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: '1.3rem' }}>{r.leaveTypeIcon || '📅'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.leaveTypeName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {format(parseISO(r.startDate), 'dd MMM')} → {format(parseISO(r.endDate), 'dd MMM yyyy')} · {r.daysCount} day{r.daysCount > 1 ? 's' : ''}
                  </div>
                  {r.hrComment && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>HR: "{r.hrComment}"</div>}
                </div>
                <span className={`badge ${STATUS_STYLES[r.status]?.class || 'badge-muted'}`}>
                  {STATUS_STYLES[r.status]?.label || r.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      <AnimatePresence>
        {showApply && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowApply(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              className="modal" style={{ maxWidth: 540 }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>Apply for Leave</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>Step {step} of 3</p>
                </div>
                <button onClick={() => setShowApply(false)} className="btn btn-ghost btn-icon"><X size={18} /></button>
              </div>

              {/* Progress */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: step >= s ? 'var(--brand-primary)' : 'var(--surface-3)', transition: 'background 0.3s' }} />
                ))}
              </div>

              {/* Step 1: AI Input */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Sparkles size={18} style={{ color: 'var(--brand-primary)' }} />
                    <h4>Tell the AI why you need leave</h4>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                    Write naturally — "I need 2 days off next Monday for a doctor's appointment" or "family vacation Aug 28-30"
                  </p>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="I need to take 3 days off from August 25th due to a family function in my hometown..."
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button className="btn btn-primary btn-full" onClick={handleAiAssist} disabled={!aiInput.trim() || aiLoading}>
                      {aiLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Analyzing...</> : <><Sparkles size={14} /> Parse with AI</>}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>Skip</button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Review/Fill Form */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <h4 style={{ marginBottom: 16 }}>Review & Confirm Details</h4>

                  <div className="form-group">
                    <label className="form-label">Leave Type *</label>
                    <select className="form-input" value={form.leaveTypeId} onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))}>
                      <option value="">Select leave type</option>
                      {types.map(t => {
                        const bal = balance.find(b => b.leaveTypeId === t.id);
                        return <option key={t.id} value={t.id}>{t.icon} {t.name} ({bal?.remaining || 0} days left)</option>;
                      })}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Start Date *</label>
                      <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date *</label>
                      <input type="date" className="form-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                        min={form.startDate || new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reason</label>
                    <textarea className="form-input" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Add a brief reason..." />
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                    <button className="btn btn-primary btn-full" onClick={() => setStep(3)} disabled={!form.leaveTypeId || !form.startDate || !form.endDate}>
                      Review <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <h4 style={{ marginBottom: 16 }}>Confirm Leave Request</h4>
                  <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)', marginBottom: 20 }}>
                    {[
                      { label: 'Type', value: types.find(t => t.id === form.leaveTypeId)?.name },
                      { label: 'From', value: form.startDate ? format(parseISO(form.startDate), 'dd MMMM yyyy') : '—' },
                      { label: 'To', value: form.endDate ? format(parseISO(form.endDate), 'dd MMMM yyyy') : '—' },
                      { label: 'Reason', value: form.reason || 'Not specified' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface-3)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.label}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>← Edit</button>
                    <button className="btn btn-success btn-full" onClick={handleApply} disabled={applyLoading}>
                      {applyLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Submitting...</> : <><Check size={14} /> Submit Request</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
