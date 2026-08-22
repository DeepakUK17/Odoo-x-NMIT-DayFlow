import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { employeesAPI } from '../../services/api';
import { Search, Plus, X, UserPlus, Edit2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function getInitials(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
}

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: '', lastName: '', email: '', designation: '', departmentId: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const load = async () => {
    try {
      const [empRes, deptRes] = await Promise.allSettled([
        employeesAPI.getAll({ limit: 100 }),
        employeesAPI.getDepartments(),
      ]);
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data.employees || []);
      if (deptRes.status === 'fulfilled') setDepts(deptRes.value.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.employeeCode} ${e.email} ${e.departmentName}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!addForm.firstName || !addForm.email) { toast.error('Name and email required'); return; }
    setAddLoading(true);
    try {
      const res = await employeesAPI.create(addForm);
      toast.success(`${addForm.firstName} added! Temp password: ${res.data.tempPassword}`);
      setShowAdd(false);
      setAddForm({ firstName: '', lastName: '', email: '', designation: '', departmentId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create employee');
    } finally {
      setAddLoading(false);
    }
  };

  const openEdit = (emp) => {
    setEditEmp(emp);
    setEditForm({ ...emp });
  };

  const handleEdit = async () => {
    setEditLoading(true);
    try {
      await employeesAPI.update(editEmp.id, editForm);
      toast.success('Employee updated');
      setEditEmp(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update employee');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="topbar">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{employees.length} total employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <UserPlus size={15} /> Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: 20 }}>
        <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input placeholder="Search by name, code, email, department..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="btn-ghost" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>}
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="grid-4">{[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--r-lg)' }} />)}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map((emp, i) => (
            <motion.div key={emp.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i < 15 ? i * 0.04 : 0 }}
              whileHover={{ y: -4 }} className="card" style={{ position: 'relative', textAlign: 'center', padding: 'var(--sp-6)' }}>
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(emp)}><Edit2 size={14}/></button>
              </div>
              <div className="avatar avatar-xl" style={{ margin: '0 auto var(--sp-4)', overflow: 'hidden' }}>
                {emp.profilePictureUrl ? <img src={emp.profilePictureUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : getInitials(emp.firstName, emp.lastName)}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{emp.firstName} {emp.lastName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{emp.designation || 'Employee'}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <span className={`badge ${emp.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{emp.status}</span>
                {emp.departmentName && <span className="badge badge-info">{emp.departmentName}</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{emp.employeeCode}</div>
              {emp.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</div>}
              {emp.joinDate && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>Joined {format(new Date(emp.joinDate), 'MMM yyyy')}</div>}
            </motion.div>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><div className="empty-state-title">No employees found</div><div className="empty-state-desc">Try a different search term</div></div>
      )}

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay"
            onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }} className="modal">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3>Add New Employee</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={18} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={addForm.designation} onChange={e => setAddForm(f => ({ ...f, designation: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-input" value={addForm.departmentId} onChange={e => setAddForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">Select department</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={addLoading}>
                {addLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Creating...</> : <><Plus size={14} /> Create Employee</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {editEmp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay"
            onClick={e => e.target === e.currentTarget && setEditEmp(null)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }} className="modal">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3>Edit Employee</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditEmp(null)}><X size={18} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Designation</label>
                <input className="form-input" value={editForm.designation} onChange={e => setEditForm(f => ({ ...f, designation: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Profile Image URL</label>
                <input className="form-input" placeholder="https://..." value={editForm.profilePictureUrl || ''} onChange={e => setEditForm(f => ({ ...f, profilePictureUrl: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={handleEdit} disabled={editLoading}>
                {editLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
