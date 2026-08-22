import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../../services/api';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const hasVerified = React.useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;
    
    authAPI.verifyEmail(token)
      .then(r => { setMessage(r.data.message); setStatus('success'); })
      .catch(e => { setMessage(e.response?.data?.error || 'Verification failed'); setStatus('error'); });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="auth-card" style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.2em', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 'var(--sp-8)' }}>DAYFLOW</div>

        {status === 'loading' && (
          <><div className="spinner spinner-lg" style={{ margin: '0 auto var(--sp-4)' }} /><p>Verifying your email...</p></>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={56} style={{ color: 'var(--success)', margin: '0 auto var(--sp-4)' }} />
            <h2>Email Verified!</h2>
            <p style={{ margin: 'var(--sp-3) 0 var(--sp-6)' }}>{message}</p>
            <Link to="/login" className="btn btn-primary btn-full" style={{ textDecoration: 'none' }}>Go to Login →</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={56} style={{ color: 'var(--danger)', margin: '0 auto var(--sp-4)' }} />
            <h2>Verification Failed</h2>
            <p style={{ margin: 'var(--sp-3) 0 var(--sp-6)' }}>{message}</p>
            <Link to="/login" className="btn btn-secondary btn-full" style={{ textDecoration: 'none' }}>Back to Login</Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
