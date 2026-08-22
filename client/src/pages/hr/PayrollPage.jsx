import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { payrollAPI, employeesAPI } from '../../services/api';
import { format } from 'date-fns';
import { Edit2, X, Save, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`;

export default function HRPayrollPage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [editEmp, setEditEmp] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.getAll({ month, year });
      setRecords(res.data.records || []);
      setSummary(res.data.summary || {});
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const openEdit = (rec) => {
    setEditEmp(rec);
    setEditForm({
      basicSalary: rec.basicSalary, hra: rec.hra, transport: rec.transport,
      otherAllowance: rec.otherAllowance, pfDeduction: rec.pfDeduction,
      taxDeduction: rec.taxDeduction, otherDeductions: '0', month, year,
    });
  };

  const saveEdit = async () => {
    setEditLoading(true);
    try {
      await payrollAPI.update(editEmp.employeeId, editForm);
      toast.success(`Payroll updated for ${editEmp.firstName} ${editEmp.lastName}`);
      setEditEmp(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally { setEditLoading(false); }
  };

  const calcNet = () => {
    const gross = parseFloat(editForm.basicSalary || 0) + parseFloat(editForm.hra || 0) + parseFloat(editForm.transport || 0) + parseFloat(editForm.otherAllowance || 0);
    const deds = parseFloat(editForm.pfDeduction || 0) + parseFloat(editForm.taxDeduction || 0) + parseFloat(editForm.otherDeductions || 0);
    return (gross - deds).toFixed(0);
  };

  return (
    <div className="animate-fadeIn">
      <div className="topbar">
        <div>
          <h1 className="page-title">Payroll Management</h1>
          <p className="page-subtitle">Total outflow: <strong style={{ color: 'var(--success)' }}>{fmt(summary.totalNetSalary)}</strong> for {MONTHS[month - 1]} {year}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-input" style={{ width: 100 }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" className="form-input" style={{ width: 90 }} value={year} onChange={e => setYear(parseInt(e.target.value))} min={2020} max={2030} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Net Payroll', value: fmt(summary.totalNetSalary), color: 'var(--success)' },
          { label: 'Total Gross', value: fmt(summary.totalGrossSalary), color: 'var(--brand-primary)' },
          { label: 'Employees', value: summary.count || 0, color: 'var(--text-primary)' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, fontSize: '1.4rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Basic</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : records.map((r, i) => (
                <motion.tr key={r.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.firstName} {r.lastName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.employeeCode}</div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{r.departmentName}</td>
                  <td>{fmt(r.basicSalary)}</td>
                  <td>{fmt(r.grossSalary)}</td>
                  <td style={{ color: 'var(--danger)' }}>-{fmt(parseFloat(r.pfDeduction || 0) + parseFloat(r.taxDeduction || 0))}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(r.netSalary)}</td>
                  <td><button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(r)}><Edit2 size={14} /></button></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editEmp && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay"
            onClick={e => e.target === e.currentTarget && setEditEmp(null)}>
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }} className="modal">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3>Edit Payroll — {editEmp.firstName} {editEmp.lastName}</h3>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditEmp(null)}><X size={18} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { key: 'basicSalary', label: 'Basic Salary' },
                  { key: 'hra', label: 'HRA' },
                  { key: 'transport', label: 'Transport' },
                  { key: 'otherAllowance', label: 'Other Allowance' },
                  { key: 'pfDeduction', label: 'PF Deduction' },
                  { key: 'taxDeduction', label: 'Tax (TDS)' },
                ].map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}</label>
                    <input type="number" className="form-input" value={editForm[f.key] || ''} onChange={e => setEditForm(fm => ({ ...fm, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--brand-gradient)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4)', textAlign: 'center', margin: '8px 0 16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Calculated Net Salary</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>₹{parseFloat(calcNet()).toLocaleString('en-IN')}</div>
              </div>

              <button className="btn btn-primary btn-full" onClick={saveEdit} disabled={editLoading}>
                {editLoading ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff' }} /> Saving...</> : <><Save size={14} /> Save Changes</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
