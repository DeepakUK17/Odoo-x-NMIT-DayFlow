import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { attendanceAPI } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { Clock, LogIn, LogOut, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  present: 'var(--success)', absent: 'var(--danger)', half_day: 'var(--warning)',
  on_leave: 'var(--info)', weekend: 'var(--text-muted)', holiday: 'var(--brand-accent)',
};

export default function AttendancePage() {
  const [today, setToday] = useState(null);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [todayRes, myRes] = await Promise.allSettled([
        attendanceAPI.getToday(),
        attendanceAPI.getMy(),
      ]);
      if (todayRes.status === 'fulfilled') setToday(todayRes.value.data.record);
      if (myRes.status === 'fulfilled') {
        setRecords(myRes.value.data.records || []);
        setStats(myRes.value.data.stats || {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const res = await attendanceAPI.checkIn();
      setToday(res.data.record);
      toast.success(res.data.message);
      if (res.data.isLate) toast('You checked in late today', { icon: '⚠️' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    try {
      const res = await attendanceAPI.checkOut();
      setToday(res.data.record);
      toast.success(`${res.data.message} 🏁`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-out failed');
    } finally {
      setCheckOutLoading(false);
    }
  };

  const checkedIn = !!today?.checkInTime;
  const checkedOut = !!today?.checkOutTime;

  // Group records for calendar view — last 5 weeks
  const workdayRecords = records.filter(r => r.status !== 'weekend');

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">Track your time — every minute matters</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Check In/Out Widget */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ background: 'linear-gradient(135deg, hsla(235,85%,62%,0.1), hsla(270,70%,65%,0.08))', border: '1px solid hsla(235,85%,62%,0.2)' }}>
          {/* Live Clock */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              {format(currentTime, 'EEEE, d MMMM yyyy')}
            </div>
          </div>

          {/* Status */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Check In</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: checkedIn ? 'var(--success)' : 'var(--text-muted)' }}>
                  {today?.checkInTime ? format(new Date(today.checkInTime), 'hh:mm a') : '--:--'}
                </div>
                {today?.isLate && <span className="badge badge-warning" style={{ fontSize: '0.65rem', marginTop: 2 }}>Late</span>}
              </div>
              <div style={{ width: 1, background: 'var(--surface-3)' }} />
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Check Out</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: checkedOut ? 'var(--success)' : 'var(--text-muted)' }}>
                  {today?.checkOutTime ? format(new Date(today.checkOutTime), 'hh:mm a') : '--:--'}
                </div>
              </div>
              {today?.workHours && (
                <>
                  <div style={{ width: 1, background: 'var(--surface-3)' }} />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Hours</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--brand-primary)' }}>{parseFloat(today.workHours).toFixed(1)}h</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className={`checkin-btn ${checkedIn ? 'checked-in' : 'not-checked-in'}`}
              style={{ flex: 1 }}
              onClick={handleCheckIn}
              disabled={checkedIn || checkInLoading}
            >
              {checkInLoading ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : <LogIn size={16} />}
              {checkedIn ? 'Checked In ✓' : 'Check In'}
            </button>
            {checkedIn && !checkedOut && (
              <button
                className="checkin-btn"
                style={{ flex: 1, background: 'linear-gradient(135deg, hsl(200,90%,45%), hsl(200,90%,38%))', color: '#fff', boxShadow: '0 8px 30px hsla(200,90%,55%,0.3)' }}
                onClick={handleCheckOut}
                disabled={checkOutLoading}
              >
                {checkOutLoading ? <div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> : <LogOut size={16} />}
                Check Out
              </button>
            )}
          </div>

          {today?.missingCheckout && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 14, display: 'flex', gap: 8, background: 'var(--warning-light)', border: '1px solid hsla(38,92%,55%,0.3)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '0.8rem', color: 'var(--warning)' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Missing checkout from a previous day was detected.
            </motion.div>
          )}
        </motion.div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Present Days', value: stats.present || 0, color: 'var(--success)', icon: '✅' },
            { label: 'Absent Days', value: stats.absent || 0, color: 'var(--danger)', icon: '❌' },
            { label: 'Half Days', value: stats.halfDay || 0, color: 'var(--warning)', icon: '🌓' },
            { label: 'Late Check-ins', value: stats.lateCount || 0, color: 'var(--warning)', icon: '⏰' },
          ].map(s => (
            <motion.div key={s.label} whileHover={{ x: 4 }} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
              <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            </motion.div>
          ))}
          <motion.div whileHover={{ x: 4 }} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'linear-gradient(135deg, hsla(235,85%,62%,0.1), transparent)' }}>
            <span style={{ fontSize: '1.3rem' }}>📊</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Rate</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.attendancePct >= 80 ? 'var(--success)' : 'var(--danger)' }}>{stats.attendancePct || 0}%</div>
          </motion.div>
        </div>
      </div>

      {/* Attendance Calendar */}
      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Monthly Overview</h3>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { status: 'present', label: 'Present' },
            { status: 'absent', label: 'Absent' },
            { status: 'half_day', label: 'Half Day' },
            { status: 'on_leave', label: 'On Leave' },
            { status: 'weekend', label: 'Weekend' },
          ].map(l => (
            <div key={l.status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div className={`att-day ${l.status}`} style={{ width: 14, height: 14, fontSize: '0.55rem' }} />
              {l.label}
            </div>
          ))}
        </div>
        {/* Calendar grid — last 35 records */}
        <div className="att-calendar">
          {records.slice(0, 35).reverse().map((r, i) => (
            <motion.div
              key={r.id || i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.015 }}
              className={`att-day ${r.status}`}
              title={`${r.date} — ${r.status}${r.checkInTime ? ` (in: ${format(new Date(r.checkInTime), 'HH:mm')})` : ''}`}
            >
              {new Date(r.date).getDate()}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Attendance Log</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 20).map((r, i) => (
                <tr key={r.id || i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{format(parseISO(r.date), 'EEE, d MMM')}</td>
                  <td>
                    <span className="badge" style={{ background: `${STATUS_COLOR[r.status]}22`, color: STATUS_COLOR[r.status] }}>
                      {r.status?.replace('_', ' ')}
                    </span>
                    {r.isLate && <span className="badge badge-warning" style={{ marginLeft: 4 }}>Late</span>}
                  </td>
                  <td>{r.checkInTime ? format(new Date(r.checkInTime), 'hh:mm a') : '—'}</td>
                  <td>
                    {r.checkOutTime ? format(new Date(r.checkOutTime), 'hh:mm a') : r.missingCheckout ? <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>Missing ⚠</span> : '—'}
                  </td>
                  <td>{r.workHours ? `${parseFloat(r.workHours).toFixed(1)}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
