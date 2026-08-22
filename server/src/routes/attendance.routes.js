import express from 'express';
import { db } from '../db/index.js';
import { attendance, employees, users, departments } from '../db/schema.js';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { authenticate, requireHR } from '../middleware/auth.js';
import { auditLogs } from '../db/schema.js';

const router = express.Router();

// Helper: get employee by userId
async function getEmployeeByUserId(userId) {
  const [emp] = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return emp;
}

// POST /api/attendance/check-in
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee profile not found' });

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, emp.id), eq(attendance.date, today)))
      .limit(1);

    if (existing && existing.checkInTime) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const now = new Date();
    const workHour = now.getHours();
    const isLate = workHour >= 10; // After 10 AM = late

    let record;
    if (existing) {
      [record] = await db.update(attendance)
        .set({ checkInTime: now, status: 'present', isLate })
        .where(eq(attendance.id, existing.id))
        .returning();
    } else {
      [record] = await db.insert(attendance).values({
        employeeId: emp.id,
        date: today,
        checkInTime: now,
        status: 'present',
        isLate,
      }).returning();
    }

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: `${emp.firstName} ${emp.lastName}`,
      action: 'CHECK_IN',
      entityType: 'attendance',
      entityId: record.id,
      metadata: { time: now.toISOString(), isLate },
    });

    // Emit socket event (attached to req by index.js)
    if (req.io) {
      req.io.to('room:hr').emit('attendance:check-in', {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        time: now.toISOString(),
        isLate,
      });
    }

    res.json({
      record,
      message: `Checked in at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      isLate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check-in failed' });
  }
});

// POST /api/attendance/check-out
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee profile not found' });

    const today = new Date().toISOString().split('T')[0];
    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, emp.id), eq(attendance.date, today)))
      .limit(1);

    if (!existing || !existing.checkInTime) {
      return res.status(400).json({ error: 'No check-in found for today' });
    }
    if (existing.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out today' });
    }

    const now = new Date();
    const checkIn = new Date(existing.checkInTime);
    const workHours = ((now - checkIn) / 3600000).toFixed(2);

    const [record] = await db.update(attendance)
      .set({
        checkOutTime: now,
        workHours: workHours.toString(),
        missingCheckout: false,
      })
      .where(eq(attendance.id, existing.id))
      .returning();

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: `${emp.firstName} ${emp.lastName}`,
      action: 'CHECK_OUT',
      entityType: 'attendance',
      entityId: record.id,
      metadata: { time: now.toISOString(), workHours },
    });

    if (req.io) {
      req.io.to('room:hr').emit('attendance:check-out', {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        time: now.toISOString(),
        workHours,
      });
    }

    res.json({ record, workHours, message: `Checked out. Work hours today: ${workHours}h` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Check-out failed' });
  }
});

// GET /api/attendance/today — Employee's today status
router.get('/today', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const today = new Date().toISOString().split('T')[0];
    const [record] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.employeeId, emp.id), eq(attendance.date, today)))
      .limit(1);

    res.json({ record: record || null, today });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today attendance' });
  }
});

// GET /api/attendance/my — Employee's own attendance history
router.get('/my', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const { startDate, endDate } = req.query;
    let query = db.select().from(attendance).where(eq(attendance.employeeId, emp.id));

    const records = await db
      .select()
      .from(attendance)
      .where(eq(attendance.employeeId, emp.id))
      .orderBy(desc(attendance.date));

    // Calculate stats
    const workdays = records.filter(r => r.status !== 'weekend' && r.status !== 'holiday');
    const present = workdays.filter(r => r.status === 'present').length;
    const absent = workdays.filter(r => r.status === 'absent').length;
    const halfDay = workdays.filter(r => r.status === 'half_day').length;
    const onLeave = workdays.filter(r => r.status === 'on_leave').length;
    const lateCount = workdays.filter(r => r.isLate).length;
    const attendancePct = workdays.length > 0 ? Math.round((present + halfDay * 0.5) / workdays.length * 100) : 0;

    res.json({
      records,
      stats: { present, absent, halfDay, onLeave, lateCount, attendancePct, totalWorkdays: workdays.length },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/all — HR: all employees attendance
router.get('/all', authenticate, requireHR, async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const records = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
        isLate: attendance.isLate,
        missingCheckout: attendance.missingCheckout,
        workHours: attendance.workHours,
        employeeId: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: employees.designation,
        departmentName: departments.name,
      })
      .from(attendance)
      .leftJoin(employees, eq(attendance.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(attendance.date, targetDate))
      .orderBy(employees.firstName);

    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
      onLeave: records.filter(r => r.status === 'on_leave').length,
      late: records.filter(r => r.isLate).length,
      missingCheckout: records.filter(r => r.missingCheckout).length,
    };

    res.json({ records, summary, date: targetDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/intelligence — Rule-based anomaly detection
router.get('/intelligence', authenticate, requireHR, async (req, res) => {
  try {
    const allEmployees = await db.select().from(employees).where(eq(employees.status, 'active'));
    const allAttendance = await db.select().from(attendance);

    const anomalies = [];

    for (const emp of allEmployees) {
      const empRecords = allAttendance.filter(a => a.employeeId === emp.id);
      const workdays = empRecords.filter(r => r.status !== 'weekend' && r.status !== 'holiday');

      if (workdays.length === 0) continue;

      const present = workdays.filter(r => r.status === 'present').length;
      const halfDays = workdays.filter(r => r.status === 'half_day').length;
      const absences = workdays.filter(r => r.status === 'absent').length;
      const lateCount = workdays.filter(r => r.isLate).length;
      const missingCheckouts = workdays.filter(r => r.missingCheckout).length;
      const attendancePct = Math.round((present + halfDays * 0.5) / workdays.length * 100);

      const issues = [];

      if (attendancePct < 75) {
        issues.push({ type: 'LOW_ATTENDANCE', severity: 'high', detail: `Attendance at ${attendancePct}%`, action: 'Issue formal warning' });
      } else if (attendancePct < 80) {
        issues.push({ type: 'LOW_ATTENDANCE', severity: 'medium', detail: `Attendance at ${attendancePct}%`, action: 'Send attendance reminder' });
      }

      if (absences >= 4) {
        issues.push({ type: 'FREQUENT_ABSENCES', severity: 'high', detail: `${absences} absences`, action: 'Schedule HR meeting' });
      }

      if (lateCount >= 3) {
        issues.push({ type: 'LATE_CHECKINS', severity: 'medium', detail: `${lateCount} late check-ins`, action: 'Send punctuality reminder' });
      }

      if (missingCheckouts >= 2) {
        issues.push({ type: 'MISSING_CHECKOUT', severity: 'medium', detail: `${missingCheckouts} missing checkouts`, action: 'Remind to check out daily' });
      }

      if (halfDays >= 4) {
        issues.push({ type: 'MULTIPLE_HALFDAYS', severity: 'low', detail: `${halfDays} half-days`, action: 'Monitor pattern' });
      }

      if (issues.length > 0) {
        anomalies.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.employeeCode,
          attendancePct,
          issues,
          topSeverity: issues.some(i => i.severity === 'high') ? 'high' : issues.some(i => i.severity === 'medium') ? 'medium' : 'low',
        });
      }
    }

    // Sort by severity
    anomalies.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.topSeverity] - order[b.topSeverity];
    });

    res.json({ anomalies, totalFlagged: anomalies.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute intelligence' });
  }
});

export default router;
