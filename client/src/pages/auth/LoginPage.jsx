import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const STAGES = { IDLE: 'idle', LOADING: 'loading', SUCCESS: 'success', TRANSITIONING: 'transitioning' };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [stage, setStage] = useState(STAGES.IDLE);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [showCard, setShowCard] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setShowCard(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setError('');
    setStage(STAGES.LOADING);

    try {
      const user = await login(email, password);
      const name = user.employee ? user.employee.firstName : user.email.split('@')[0];
      setUserName(name);
      setStage(STAGES.SUCCESS);

      setTimeout(() => {
        setStage(STAGES.TRANSITIONING);
        setTimeout(() => {
          navigate(user.role === 'hr_admin' ? '/hr' : '/dashboard');
        }, 700);
      }, 1200);
    } catch (err) {
      setStage(STAGES.IDLE);
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    }
  };

  const btnContent = () => {
    if (stage === STAGES.LOADING) return <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Authenticating...</>;
    if (stage === STAGES.SUCCESS) return <><Check size={16} /> Welcome back, {userName}!</>;
    if (stage === STAGES.TRANSITIONING) return <>Opening Dayflow...</>;
    return <>Enter Dayflow <ArrowRight size={16} /></>;
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      {/* Full screen transition overlay */}
      <AnimatePresence>
        {stage === STAGES.TRANSITIONING && (
          <motion.div
            initial={{ scaleY: 0, transformOrigin: 'bottom' }}
            animate={{ scaleY: 1 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16
            }}
          >
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.2em', color: '#fff' }}>
              DAYFLOW
            </motion.div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Opening your workspace...</div>
            <div style={{ width: 200, position: 'relative', height: 2, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
              <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 0.6, ease: 'easeInOut' }}
                style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: 99 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ marginBottom: 40 }}
        >
          <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '0.25em', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            DAYFLOW
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.12em', marginTop: 4 }}
          >
            THE HUMAN OPERATING SYSTEM
          </motion.div>

          {/* Pulse bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="dayflow-pulse"
            style={{ width: 220, margin: '16px auto 0' }}
          />
        </motion.div>

        {/* Login Card */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="auth-card"
            >
              <div className="auth-title">Welcome back</div>
              <div className="auth-subtitle">Sign in to your Dayflow workspace</div>

              <form onSubmit={handleSubmit}>
                {/* Email */}
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      className="form-input"
                      style={{ paddingLeft: 38 }}
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={stage !== STAGES.IDLE}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingLeft: 38, paddingRight: 42 }}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={stage !== STAGES.IDLE}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    style={{ background: 'var(--danger-light)', border: '1px solid hsla(4,84%,58%,0.3)', borderRadius: 'var(--r-md)', padding: '10px 14px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 'var(--sp-5)' }}>
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={stage !== STAGES.IDLE}
                  style={{ marginTop: 4, background: stage === STAGES.SUCCESS ? 'linear-gradient(135deg, var(--success), hsl(142,68%,38%))' : undefined }}
                >
                  {btnContent()}
                </button>
              </form>

              <div style={{ marginTop: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                New to Dayflow?{' '}
                <Link to="/signup" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Create account</Link>
              </div>

              {/* Demo credentials */}
              <div style={{ marginTop: 'var(--sp-5)', padding: 'var(--sp-4)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Demo Credentials (Click to auto-fill)</div>
                
                <div 
                  onClick={() => { setEmail('hr@dayflow.com'); setPassword('Hr@dayflow2026'); }}
                  style={{ display: 'flex', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: 'var(--surface-3)', marginBottom: 6, transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--surface-4)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--surface-3)'}
                >
                  <span style={{ width: 16 }}>🏢</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>HR Admin</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', color: 'var(--text-secondary)' }}>
                      <span>hr@dayflow.com</span>
                      <span style={{ color: 'var(--text-muted)' }}>/</span>
                      <span>Hr@dayflow2026</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => { setEmail('deepak@dayflow.com'); setPassword('Emp@dayflow2026'); }}
                  style={{ display: 'flex', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: 'var(--surface-3)', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--surface-4)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--surface-3)'}
                >
                  <span style={{ width: 16 }}>👤</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Employee</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', color: 'var(--text-secondary)' }}>
                      <span>deepak@dayflow.com</span>
                      <span style={{ color: 'var(--text-muted)' }}>/</span>
                      <span>Emp@dayflow2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
