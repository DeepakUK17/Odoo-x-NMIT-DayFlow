import express from 'express';
import { db } from '../db/index.js';
import { leaveRequests, leaveTypes, leaveBalances, employees, users, notifications, auditLogs, attendance } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

async function getEmployeeByUserId(userId) {
  const [emp] = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return emp;
}

// GET /api/leave/types
router.get('/types', authenticate, async (req, res) => {
  try {
    const types = await db.select().from(leaveTypes);
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});

// GET /api/leave/balance — Employee's leave balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const balances = await db
      .select({
        id: leaveBalances.id,
        total: leaveBalances.total,
        used: leaveBalances.used,
        remaining: leaveBalances.remaining,
        leaveTypeId: leaveTypes.id,
        leaveTypeName: leaveTypes.name,
        leaveTypeIcon: leaveTypes.icon,
        leaveTypeColor: leaveTypes.colorCode,
        isPaid: leaveTypes.isPaid,
      })
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(and(eq(leaveBalances.employeeId, emp.id), eq(leaveBalances.year, new Date().getFullYear())));

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave balance' });
  }
});

// GET /api/leave/my-requests
router.get('/my-requests', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const requests = await db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        daysCount: leaveRequests.daysCount,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        hrComment: leaveRequests.hrComment,
        reviewedAt: leaveRequests.reviewedAt,
        createdAt: leaveRequests.createdAt,
        leaveTypeName: leaveTypes.name,
        leaveTypeIcon: leaveTypes.icon,
        leaveTypeColor: leaveTypes.colorCode,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(eq(leaveRequests.employeeId, emp.id))
      .orderBy(desc(leaveRequests.createdAt));

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// GET /api/leave/all — HR: all leave requests
router.get('/all', authenticate, requireHR, async (req, res) => {
  try {
    const { status } = req.query;

    const requests = await db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        daysCount: leaveRequests.daysCount,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        hrComment: leaveRequests.hrComment,
        reviewedAt: leaveRequests.reviewedAt,
        createdAt: leaveRequests.createdAt,
        leaveTypeId: leaveRequests.leaveTypeId,
        leaveTypeName: leaveTypes.name,
        leaveTypeIcon: leaveTypes.icon,
        leaveTypeColor: leaveTypes.colorCode,
        employeeId: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: employees.designation,
      })
      .from(leaveRequests)
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .leftJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .orderBy(desc(leaveRequests.createdAt));

    const filtered = status ? requests.filter(r => r.status === status) : requests;
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// POST /api/leave/apply
router.post('/apply', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const { leaveTypeId, startDate, endDate, reason } = req.body;

    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Leave type, start date, and end date required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Calculate business days
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) days++;
      current.setDate(current.getDate() + 1);
    }

    // Check balance
    const [balance] = await db
      .select()
      .from(leaveBalances)
      .where(and(
        eq(leaveBalances.employeeId, emp.id),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, new Date().getFullYear())
      ))
      .limit(1);

    if (balance && balance.remaining < days) {
      return res.status(400).json({ error: `Insufficient leave balance. Available: ${balance.remaining} days, Requested: ${days} days` });
    }

    const [request] = await db.insert(leaveRequests).values({
      employeeId: emp.id,
      leaveTypeId,
      startDate,
      endDate,
      daysCount: days,
      reason,
      status: 'pending',
    }).returning();

    // Notify HR users
    const hrUsers = await db.select().from(users).where(eq(users.role, 'hr_admin'));
    for (const hr of hrUsers) {
      const [notif] = await db.insert(notifications).values({
        recipientId: hr.id,
        type: 'leave_submitted',
        title: 'New Leave Request',
        message: `${emp.firstName} ${emp.lastName} applied for ${days} day(s) leave from ${startDate} to ${endDate}.`,
        actionUrl: `/hr/leave`,
        metadata: { leaveRequestId: request.id, employeeId: emp.id },
      }).returning();

      // Emit socket
      if (req.io) {
        req.io.to('room:hr').emit('leave:submitted', {
          leaveRequest: request,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          notification: notif,
        });
      }
    }

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: `${emp.firstName} ${emp.lastName}`,
      action: 'LEAVE_SUBMITTED',
      entityType: 'leave_request',
      entityId: request.id,
      metadata: { startDate, endDate, days },
    });

    res.status(201).json({ request, message: 'Leave request submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

// PATCH /api/leave/:id/approve — HR only
router.patch('/:id/approve', authenticate, requireHR, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: 'Leave request not found' });
    if (request.status === 'approved') return res.status(400).json({ error: 'Already approved' });

    const [updated] = await db.update(leaveRequests)
      .set({ status: 'approved', hrComment: comment, reviewedBy: req.user.id, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();

    // Deduct leave balance
    const year = new Date(request.startDate).getFullYear();
    await db.update(leaveBalances)
      .set({
        used: sql`used + ${request.daysCount}`,
        remaining: sql`remaining - ${request.daysCount}`,
      })
      .where(and(
        eq(leaveBalances.employeeId, request.employeeId),
        eq(leaveBalances.leaveTypeId, request.leaveTypeId),
        eq(leaveBalances.year, year)
      ));

    // Update attendance records to on_leave
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        const dateStr = current.toISOString().split('T')[0];
        await db.insert(attendance)
          .values({ employeeId: request.employeeId, date: dateStr, status: 'on_leave' })
          .onConflictDoNothing();
      }
      current.setDate(current.getDate() + 1);
    }

    // Get employee's user to notify
    const [emp] = await db.select().from(employees).where(eq(employees.id, request.employeeId)).limit(1);
    if (emp) {
      const [notif] = await db.insert(notifications).values({
        recipientId: emp.userId,
        type: 'leave_approved',
        title: '🟢 Leave Request Approved',
        message: `Your leave from ${request.startDate} to ${request.endDate} has been approved. ${comment ? `HR note: ${comment}` : ''}`,
        actionUrl: '/leave',
        metadata: { leaveRequestId: id },
      }).returning();

      if (req.io) {
        req.io.to(`room:employee:${emp.userId}`).emit('leave:approved', {
          leaveRequestId: id,
          notification: notif,
          message: `Your leave from ${request.startDate} to ${request.endDate} has been approved!`,
        });
        req.io.to('room:hr').emit('dashboard:refresh', { type: 'leave_approved' });
      }
    }

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: req.user.email,
      action: 'LEAVE_APPROVED',
      entityType: 'leave_request',
      entityId: id,
      metadata: { comment, employeeId: request.employeeId },
    });

    res.json({ request: updated, message: 'Leave approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve leave' });
  }
});

// PATCH /api/leave/:id/reject — HR only
router.patch('/:id/reject', authenticate, requireHR, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
    if (!request) return res.status(404).json({ error: 'Leave request not found' });

    const [updated] = await db.update(leaveRequests)
      .set({ status: 'rejected', hrComment: comment, reviewedBy: req.user.id, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();

    const [emp] = await db.select().from(employees).where(eq(employees.id, request.employeeId)).limit(1);
    if (emp) {
      const [notif] = await db.insert(notifications).values({
        recipientId: emp.userId,
        type: 'leave_rejected',
        title: '🔴 Leave Request Rejected',
        message: `Your leave from ${request.startDate} to ${request.endDate} has been rejected. ${comment ? `Reason: ${comment}` : ''}`,
        actionUrl: '/leave',
        metadata: { leaveRequestId: id },
      }).returning();

      if (req.io) {
        req.io.to(`room:employee:${emp.userId}`).emit('leave:rejected', {
          leaveRequestId: id,
          notification: notif,
        });
      }
    }

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: req.user.email,
      action: 'LEAVE_REJECTED',
      entityType: 'leave_request',
      entityId: id,
      metadata: { comment },
    });

    res.json({ request: updated, message: 'Leave rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject leave' });
  }
});

export default router;
