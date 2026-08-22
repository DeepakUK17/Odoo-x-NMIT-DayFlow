import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { employeesAPI } from '../../services/api';
import { format } from 'date-fns';
import { RotateCcw, Mail, Phone, MapPin, Calendar, Briefcase, Building2, Edit2, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

function getInitials(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

export default function PassportPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (user?.employee?.id) {
      employeesAPI.getById(user.employee.id)
        .then(r => setProfile(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, [user]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner spinner-lg" /></div>;
  if (!profile) return <div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-title">Profile not found</div></div>;

  const tenure = profile.joinDate ? Math.floor((new Date() - new Date(profile.joinDate)) / (365.25 * 24 * 3600000)) : 0;

  const handleEdit = async () => {
    setEditLoading(true);
    try {
      await employeesAPI.update(profile.id, editForm);
      toast.success('Profile updated successfully');
      setShowEdit(false);
      // Reload profile
      const r = await employeesAPI.getById(user.employee.id);
      setProfile(r.data);
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const openEdit = () => {
    setEditForm({ phone: profile.phone, address: profile.address, emergencyContact: profile.emergencyContact, profilePictureUrl: profile.profilePictureUrl });
    setShowEdit(true);
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Employee Passport</h1>
          <p className="page-subtitle">Your professional identity card — click to flip</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={openEdit}><Edit2 size={14} /> Edit Profile</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
        {/* Passport Flip Card */}
        <div>
          <div className={`passport-wrapper ${flipped ? 'flipped' : ''}`} style={{ width: '100%', height: 220 }} onClick={() => setFlipped(f => !f)}>
            <div className="passport-inner">
              {/* Front */}
              <div className="passport-front">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Employee Passport</div>
                    <div style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>DAYFLOW — Issued {profile.joinDate ? format(new Date(profile.joinDate), 'yyyy') : '—'}</div>
                  </div>
                  <div style={{ fontSize: '1.5rem', opacity: 0.4 }}>🇮🇳</div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="avatar avatar-xl" style={{ border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0, overflow: 'hidden' }}>
                    {profile.profilePictureUrl ? <img src={profile.profilePictureUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : getInitials(profile.firstName, profile.lastName)}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>
                      {profile.firstName} {profile.lastName}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: 4 }}>{profile.designation || 'Employee'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2 }}>{profile.departmentName}</div>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Employee ID</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace' }}>{profile.employeeCode}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Joined</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                      {profile.joinDate ? format(new Date(profile.joinDate), 'MMM yyyy') : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="passport-back">
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Contact Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: <Mail size={12} />, value: profile.email || '—' },
                    { icon: <Phone size={12} />, value: profile.phone || '—' },
                    { icon: <MapPin size={12} />, value: profile.address || '—' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--surface-3)', marginTop: 16 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>EMERGENCY</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{profile.emergencyContact || 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <RotateCcw size={12} style={{ marginRight: 4 }} /> Click to flip
          </div>
        </div>

        {/* Profile Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Professional Info</h3>
            {[
              { icon: <Briefcase size={15} />, label: 'Designation', value: profile.designation || '—' },
              { icon: <Building2 size={15} />, label: 'Department', value: profile.departmentName || '—' },
              { icon: <Calendar size={15} />, label: 'Join Date', value: profile.joinDate ? format(new Date(profile.joinDate), 'MMMM d, yyyy') : '—' },
              { icon: <Calendar size={15} />, label: 'Tenure', value: `${tenure} year${tenure !== 1 ? 's' : ''}` },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--surface-2)' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', width: 100, flexShrink: 0 }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Leave Balances */}
          {profile.leaveBalances?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Leave Summary</h3>
              {profile.leaveBalances.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: '1.1rem' }}>{b.leaveTypeIcon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{b.leaveTypeName}</span>
                      <span style={{ fontWeight: 700 }}>{b.remaining}/{b.total}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${(b.remaining / b.total) * 100}%`, height: '100%', background: b.leaveTypeColor, borderRadius: 99 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEdit(false)}>
          <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3>Edit Profile</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEdit(false)}><X size={18} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Profile Image URL</label>
              <input className="form-input" placeholder="https://..." value={editForm.profilePictureUrl || ''} onChange={e => setEditForm(f => ({ ...f, profilePictureUrl: e.target.value }))} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>You can use Unsplash or pravatar.cc URLs.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Contact</label>
              <input className="form-input" value={editForm.emergencyContact || ''} onChange={e => setEditForm(f => ({ ...f, emergencyContact: e.target.value }))} />
            </div>

            <button className="btn btn-primary btn-full" onClick={handleEdit} disabled={editLoading}>
              {editLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving...</> : <><Save size={14} /> Update Profile</>}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
