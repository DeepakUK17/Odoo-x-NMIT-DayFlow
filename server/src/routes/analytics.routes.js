import express from 'express';
import { db } from '../db/index.js';
import { attendance, employees, leaveRequests, payroll, departments, users } from '../db/schema.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/hr-summary — KPIs for HR Command Center
router.get('/hr-summary', authenticate, requireHR, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const allEmployees = await db.select().from(employees).where(eq(employees.status, 'active'));
    const totalEmployees = allEmployees.length;

    const todayAttendance = await db.select().from(attendance).where(eq(attendance.date, today));

    const present = todayAttendance.filter(a => a.status === 'present').length;
    const onLeave = todayAttendance.filter(a => a.status === 'on_leave').length;
    const halfDay = todayAttendance.filter(a => a.status === 'half_day').length;
    const absent = totalEmployees - present - onLeave - halfDay;
    const late = todayAttendance.filter(a => a.isLate).length;
    const missingCheckout = todayAttendance.filter(a => a.missingCheckout).length;

    const attendancePct = totalEmployees > 0
      ? Math.round(((present + halfDay * 0.5) / totalEmployees) * 100)
      : 0;

    const pendingLeaves = await db.select().from(leaveRequests).where(eq(leaveRequests.status, 'pending'));

    const allPayroll = await db.select().from(payroll).where(
      and(eq(payroll.month, new Date().getMonth() + 1), eq(payroll.year, new Date().getFullYear()))
    );
    const totalPayroll = allPayroll.reduce((s, p) => s + parseFloat(p.netSalary || 0), 0);

    res.json({
      totalEmployees,
      present,
      absent: Math.max(0, absent),
      onLeave,
      halfDay,
      late,
      missingCheckout,
      attendancePct,
      pendingLeaves: pendingLeaves.length,
      totalPayroll,
      date: today,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch HR summary' });
  }
});

// GET /api/analytics/attendance-trend — Weekly trend
router.get('/attendance-trend', authenticate, requireHR, async (req, res) => {
  try {
    const result = [];
    const allEmployees = await db.select().from(employees).where(eq(employees.status, 'active'));
    const total = allEmployees.length;

    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 6);
    const startDateStr = dStart.toISOString().split('T')[0];

    const recentAttendance = await db.select().from(attendance).where(sql`${attendance.date} >= ${startDateStr}`);

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      const dayRecords = recentAttendance.filter(r => r.date === dateStr);
      const present = dayRecords.filter(r => r.status === 'present').length;
      const absent = dayRecords.filter(r => r.status === 'absent').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      result.push({
        date: dateStr,
        label: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
        present,
        absent,
        pct,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trend' });
  }
});

// GET /api/analytics/leave-distribution
router.get('/leave-distribution', authenticate, requireHR, async (req, res) => {
  try {
    const allLeaves = await db.select().from(leaveRequests);
    const pending = allLeaves.filter(l => l.status === 'pending').length;
    const approved = allLeaves.filter(l => l.status === 'approved').length;
    const rejected = allLeaves.filter(l => l.status === 'rejected').length;

    res.json([
      { status: 'Pending', count: pending, color: '#f59e0b' },
      { status: 'Approved', count: approved, color: '#10b981' },
      { status: 'Rejected', count: rejected, color: '#ef4444' },
    ]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave distribution' });
  }
});

// GET /api/analytics/department-absenteeism
router.get('/department-absenteeism', authenticate, requireHR, async (req, res) => {
  try {
    const allDepts = await db.select().from(departments);
    const allEmps = await db.select().from(employees);
    
    // Only fetch last 30 days of attendance
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 30);
    const startDateStr = dStart.toISOString().split('T')[0];
    
    const allAtt = await db.select().from(attendance).where(sql`${attendance.date} >= ${startDateStr}`);
    const result = [];

    for (const dept of allDepts) {
      const deptEmps = allEmps.filter(e => e.departmentId === dept.id);
      if (deptEmps.length === 0) continue;

      const deptEmpIds = deptEmps.map(e => e.id);
      const deptAtt = allAtt.filter(a => deptEmpIds.includes(a.employeeId));
      const workdays = deptAtt.filter(a => a.status !== 'weekend' && a.status !== 'holiday');
      const absent = workdays.filter(a => a.status === 'absent').length;
      const absentPct = workdays.length > 0 ? Math.round((absent / workdays.length) * 100) : 0;

      result.push({ department: dept.name, code: dept.code, absent, absentPct, employeeCount: deptEmps.length });
    }

    res.json(result.sort((a, b) => b.absentPct - a.absentPct));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch department absenteeism' });
  }
});

// GET /api/analytics/employee-stats — Personal stats for employee
router.get('/employee-stats', authenticate, async (req, res) => {
  try {
    const [emp] = await db.select().from(employees).where(eq(employees.userId, req.user.id)).limit(1);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const allAtt = await db.select().from(attendance).where(eq(attendance.employeeId, emp.id));
    const workdays = allAtt.filter(a => a.status !== 'weekend' && a.status !== 'holiday');
    const present = workdays.filter(a => a.status === 'present').length;
    const absent = workdays.filter(a => a.status === 'absent').length;
    const halfDay = workdays.filter(a => a.status === 'half_day').length;
    const onLeave = workdays.filter(a => a.status === 'on_leave').length;
    const lateCount = workdays.filter(a => a.isLate).length;
    const attendancePct = workdays.length > 0 ? Math.round(((present + halfDay * 0.5) / workdays.length) * 100) : 0;

    // Monthly trend (last 4 weeks)
    const trend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekAtt = workdays.filter(a => {
        const d = new Date(a.date);
        return d >= weekStart && d <= weekEnd;
      });
      const weekPresent = weekAtt.filter(a => a.status === 'present').length;
      const weekTotal = weekAtt.length;
      trend.push({
        week: `Week ${4 - i}`,
        pct: weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0,
      });
    }

    res.json({ present, absent, halfDay, onLeave, lateCount, attendancePct, trend });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee stats' });
  }
});

export default router;
