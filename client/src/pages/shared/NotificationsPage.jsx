import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { notificationsAPI } from '../../services/api';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const NOTIF_ICONS = {
  leave_approved: '✅', leave_rejected: '❌', leave_submitted: '📋',
  attendance_alert: '⏰', payroll_updated: '💰', employee_added: '👤', general: '🔔',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const load = () => {
    notificationsAPI.getAll({ limit: 50 })
      .then(r => { setNotifications(r.data.notifications || []); setUnread(r.data.unreadCount || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationsAPI.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    toast.success('All notifications marked as read');
  };

  return (
    <div className="animate-fadeIn">
      <div className="topbar">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread} unread message{unread !== 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="spinner spinner-lg" /></div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={40} style={{ color: 'var(--text-muted)', margin: '0 auto var(--sp-4)' }} />
            <div className="empty-state-title">All caught up!</div>
            <div className="empty-state-desc">No notifications to show</div>
          </div>
        ) : (
          notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`notif-item ${!n.isRead ? 'unread' : ''}`}
              onClick={() => !n.isRead && markRead(n.id)}
            >
              <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>{NOTIF_ICONS[n.type] || '🔔'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{n.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 3 }}>{n.message}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                </div>
              </div>
              {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)', flexShrink: 0, marginTop: 6 }} />}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
