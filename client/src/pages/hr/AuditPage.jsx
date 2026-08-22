import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { auditAPI } from '../../services/api';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';

const ACTION_ICONS = {
  LOGIN: '🔑', SIGNUP: '👤', CHECK_IN: '🟢', CHECK_OUT: '🔴',
  LEAVE_SUBMITTED: '📋', LEAVE_APPROVED: '✅', LEAVE_REJECTED: '❌',
  PAYROLL_UPDATED: '💰', EMPLOYEE_ADDED: '👤', PROFILE_UPDATED: '✏️',
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditAPI.getAll({ limit: 100 })
      .then(r => setLogs(r.data.logs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Activity Log</h1>
        <p className="page-subtitle">Complete audit trail of all system actions</p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <motion.tr key={log.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {format(new Date(log.createdAt), 'dd MMM HH:mm:ss')}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{log.actorName || '—'}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{ACTION_ICONS[log.action] || '📝'}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--brand-primary)' }}>{log.action}</span>
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.entityType || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
