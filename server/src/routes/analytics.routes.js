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

    const [empStats] = await db.select({ count: sql`count(*)::int` }).from(employees).where(eq(employees.status, 'active'));
    const totalEmployees = empStats.count || 0;

    const [attStats] = await db.select({
      present: sql`count(*) filter (where ${attendance.status} = 'present')::int`,
      onLeave: sql`count(*) filter (where ${attendance.status} = 'on_leave')::int`,
      halfDay: sql`count(*) filter (where ${attendance.status} = 'half_day')::int`,
      late: sql`count(*) filter (where ${attendance.isLate} = true)::int`,
      missingCheckout: sql`count(*) filter (where ${attendance.missingCheckout} = true)::int`
    }).from(attendance).where(eq(attendance.date, today));

    const present = attStats?.present || 0;
    const onLeave = attStats?.onLeave || 0;
    const halfDay = attStats?.halfDay || 0;
    const absent = totalEmployees - present - onLeave - halfDay;
    const late = attStats?.late || 0;
    const missingCheckout = attStats?.missingCheckout || 0;

    const attendancePct = totalEmployees > 0
      ? Math.round(((present + halfDay * 0.5) / totalEmployees) * 100)
      : 0;

    const [leaveStats] = await db.select({ count: sql`count(*)::int` }).from(leaveRequests).where(eq(leaveRequests.status, 'pending'));

    const [payrollStats] = await db.select({ total: sql`sum(cast(${payroll.netSalary} as numeric))` }).from(payroll).where(
      and(eq(payroll.month, new Date().getMonth() + 1), eq(payroll.year, new Date().getFullYear()))
    );
    const totalPayroll = payrollStats?.total ? parseFloat(payrollStats.total) : 0;

    res.json({
      totalEmployees,
      present,
      absent: Math.max(0, absent),
      onLeave,
      halfDay,
      late,
      missingCheckout,
      attendancePct,
      pendingLeaves: leaveStats?.count || 0,
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
    const [empStats] = await db.select({ count: sql`count(*)::int` }).from(employees).where(eq(employees.status, 'active'));
    const total = empStats?.count || 0;

    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 6);
    const startDateStr = dStart.toISOString().split('T')[0];

    const stats = await db.select({
      date: attendance.date,
      present: sql`count(*) filter (where ${attendance.status} = 'present')::int`,
      absent: sql`count(*) filter (where ${attendance.status} = 'absent')::int`,
    }).from(attendance)
      .where(sql`${attendance.date} >= ${startDateStr}`)
      .groupBy(attendance.date);

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      const dayStat = stats.find(s => s.date === dateStr);
      const present = dayStat?.present || 0;
      const absent = dayStat?.absent || 0;
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
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trend' });
  }
});

// GET /api/analytics/leave-distribution
router.get('/leave-distribution', authenticate, requireHR, async (req, res) => {
  try {
    const stats = await db.select({
      status: leaveRequests.status,
      count: sql`count(*)::int`
    }).from(leaveRequests).groupBy(leaveRequests.status);

    const pending = stats.find(s => s.status === 'pending')?.count || 0;
    const approved = stats.find(s => s.status === 'approved')?.count || 0;
    const rejected = stats.find(s => s.status === 'rejected')?.count || 0;

    res.json([
      { status: 'Pending', count: pending, color: '#f59e0b' },
      { status: 'Approved', count: approved, color: '#10b981' },
      { status: 'Rejected', count: rejected, color: '#ef4444' },
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave distribution' });
  }
});

// GET /api/analytics/department-absenteeism
router.get('/department-absenteeism', authenticate, requireHR, async (req, res) => {
  try {
    const dStart = new Date();
    dStart.setDate(dStart.getDate() - 30);
    const startDateStr = dStart.toISOString().split('T')[0];
    
    const results = await db.select({
      department: departments.name,
      code: departments.code,
      employeeCount: sql`count(distinct ${employees.id})::int`,
      absent: sql`count(${attendance.id}) filter (where ${attendance.status} = 'absent' and ${attendance.date} >= ${startDateStr})::int`,
      workdays: sql`count(${attendance.id}) filter (where ${attendance.status} not in ('weekend', 'holiday') and ${attendance.date} >= ${startDateStr})::int`
    })
    .from(departments)
    .leftJoin(employees, eq(employees.departmentId, departments.id))
    .leftJoin(attendance, eq(attendance.employeeId, employees.id))
    .groupBy(departments.id);

    const formatted = results.map(r => {
      const absentPct = r.workdays > 0 ? Math.round((r.absent / r.workdays) * 100) : 0;
      return {
        department: r.department,
        code: r.code,
        absent: r.absent || 0,
        absentPct,
        employeeCount: r.employeeCount || 0
      };
    }).filter(r => r.employeeCount > 0);

    res.json(formatted.sort((a, b) => b.absentPct - a.absentPct));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch department absenteeism' });
  }
});

// GET /api/analytics/employee-stats — Personal stats for employee
router.get('/employee-stats', authenticate, async (req, res) => {
  try {
    const [emp] = await db.select().from(employees).where(eq(employees.userId, req.user.id)).limit(1);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const [stats] = await db.select({
      present: sql`count(*) filter (where ${attendance.status} = 'present' and ${attendance.status} not in ('weekend', 'holiday'))::int`,
      absent: sql`count(*) filter (where ${attendance.status} = 'absent' and ${attendance.status} not in ('weekend', 'holiday'))::int`,
      halfDay: sql`count(*) filter (where ${attendance.status} = 'half_day' and ${attendance.status} not in ('weekend', 'holiday'))::int`,
      onLeave: sql`count(*) filter (where ${attendance.status} = 'on_leave' and ${attendance.status} not in ('weekend', 'holiday'))::int`,
      lateCount: sql`count(*) filter (where ${attendance.isLate} = true and ${attendance.status} not in ('weekend', 'holiday'))::int`,
      totalWorkdays: sql`count(*) filter (where ${attendance.status} not in ('weekend', 'holiday'))::int`,
    }).from(attendance).where(eq(attendance.employeeId, emp.id));

    const present = stats?.present || 0;
    const absent = stats?.absent || 0;
    const halfDay = stats?.halfDay || 0;
    const onLeave = stats?.onLeave || 0;
    const lateCount = stats?.lateCount || 0;
    const totalWorkdays = stats?.totalWorkdays || 0;
    
    const attendancePct = totalWorkdays > 0 ? Math.round(((present + halfDay * 0.5) / totalWorkdays) * 100) : 0;

    const trend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const [weekStats] = await db.select({
        weekPresent: sql`count(*) filter (where ${attendance.status} = 'present' and ${attendance.status} not in ('weekend', 'holiday'))::int`,
        weekTotal: sql`count(*) filter (where ${attendance.status} not in ('weekend', 'holiday'))::int`
      }).from(attendance)
        .where(
          and(
            eq(attendance.employeeId, emp.id),
            sql`${attendance.date} >= ${weekStart.toISOString().split('T')[0]}`,
            sql`${attendance.date} <= ${weekEnd.toISOString().split('T')[0]}`
          )
        );
      
      const weekPresent = weekStats?.weekPresent || 0;
      const weekTotal = weekStats?.weekTotal || 0;
      trend.push({
        week: `Week ${4 - i}`,
        pct: weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0,
      });
    }

    res.json({ present, absent, halfDay, onLeave, lateCount, attendancePct, trend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employee stats' });
  }
});

export default router;
