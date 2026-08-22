import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI, employeesAPI } from '../../services/api';
import { Mail, Lock, User, Building2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', departmentId: '' });
  const [depts, setDepts] = React.useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    employeesAPI.getDepartments().then(r => setDepts(r.data)).catch(() => {});
  }, []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) { setError('Please fill required fields'); return; }
    if (form.password.length < 6) { setError('Password must be 6+ characters'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.signup(form);
      const { verifyToken } = res.data;
      setSuccess(`Account created! Verify your email at: /verify-email/${verifyToken}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-text">DAYFLOW</span>
          <span className="auth-logo-sub">Create your workspace account</span>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-4)' }}>✉️</div>
            <h3 style={{ marginBottom: 'var(--sp-3)' }}>Account Created!</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 'var(--sp-4)' }}>Check your email to verify your account, or use the verification link below:</p>
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-3)', fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--brand-primary)' }}>{success.split('at: ')[1]}</div>
            <Link to={success.split('at: ')[1]} className="btn btn-primary btn-full" style={{ marginTop: 'var(--sp-4)', textDecoration: 'none' }}>
              Verify Email Now <ArrowRight size={15} />
            </Link>
            <Link to="/login" style={{ display: 'block', marginTop: 'var(--sp-3)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input className="form-input" value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Deepak" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="U K" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" className="form-input" style={{ paddingLeft: 36 }} value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@company.com" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="password" className="form-input" style={{ paddingLeft: 36 }} value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min. 6 characters" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select className="form-input" style={{ paddingLeft: 36 }} value={form.departmentId} onChange={e => update('departmentId', e.target.value)}>
                  <option value="">Select department</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {error && <div className="form-error" style={{ marginBottom: 'var(--sp-4)', background: 'var(--danger-light)', padding: 'var(--sp-3)', borderRadius: 'var(--r-md)' }}>{error}</div>}

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Creating account...</> : <>Create Account <ArrowRight size={15} /></>}
            </button>
          </form>
        )}

        {!success && (
          <div style={{ marginTop: 'var(--sp-5)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Sign in</Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
