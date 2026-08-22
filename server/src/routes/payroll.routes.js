import express from 'express';
import { db } from '../db/index.js';
import { payroll, employees, users, departments, auditLogs, notifications } from '../db/schema.js';
import { eq, and, desc, sum } from 'drizzle-orm';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

async function getEmployeeByUserId(userId) {
  const [emp] = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return emp;
}

// GET /api/payroll/my — Employee's own payroll
router.get('/my', authenticate, async (req, res) => {
  try {
    const emp = await getEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const records = await db
      .select()
      .from(payroll)
      .where(eq(payroll.employeeId, emp.id))
      .orderBy(desc(payroll.year), desc(payroll.month));

    res.json({ records, currentMonth: records[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// GET /api/payroll/all — HR: all employees payroll
router.get('/all', authenticate, requireHR, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const records = await db
      .select({
        id: payroll.id,
        employeeId: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: employees.designation,
        departmentName: departments.name,
        basicSalary: payroll.basicSalary,
        grossSalary: payroll.grossSalary,
        netSalary: payroll.netSalary,
        pfDeduction: payroll.pfDeduction,
        taxDeduction: payroll.taxDeduction,
        month: payroll.month,
        year: payroll.year,
        generatedAt: payroll.generatedAt,
      })
      .from(payroll)
      .leftJoin(employees, eq(payroll.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(eq(payroll.month, parseInt(month)), eq(payroll.year, parseInt(year))))
      .orderBy(employees.firstName);

    const totalNetSalary = records.reduce((sum, r) => sum + parseFloat(r.netSalary || 0), 0);
    const totalGrossSalary = records.reduce((sum, r) => sum + parseFloat(r.grossSalary || 0), 0);

    res.json({ records, summary: { totalNetSalary, totalGrossSalary, count: records.length }, month, year });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// GET /api/payroll/:employeeId — specific employee payroll (HR or self)
router.get('/:employeeId', authenticate, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const myEmp = await getEmployeeByUserId(req.user.id);

    if (req.user.role !== 'hr_admin' && myEmp?.id !== employeeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const records = await db
      .select()
      .from(payroll)
      .where(eq(payroll.employeeId, employeeId))
      .orderBy(desc(payroll.year), desc(payroll.month));

    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// PUT /api/payroll/:employeeId — HR update salary
router.put('/:employeeId', authenticate, requireHR, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { basicSalary, hra, transport, otherAllowance, pfDeduction, taxDeduction, otherDeductions, month, year } = req.body;

    const gross = parseFloat(basicSalary) + parseFloat(hra || 0) + parseFloat(transport || 0) + parseFloat(otherAllowance || 0);
    const net = gross - parseFloat(pfDeduction || 0) - parseFloat(taxDeduction || 0) - parseFloat(otherDeductions || 0);

    // Upsert payroll record
    const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
    const existing = await db.select().from(payroll).where(
      and(eq(payroll.employeeId, employeeId), eq(payroll.month, month), eq(payroll.year, year))
    ).limit(1);

    let record;
    if (existing[0]) {
      [record] = await db.update(payroll)
        .set({ basicSalary: basicSalary.toString(), hra: hra?.toString(), transport: transport?.toString(), otherAllowance: otherAllowance?.toString(), grossSalary: gross.toString(), pfDeduction: pfDeduction?.toString(), taxDeduction: taxDeduction?.toString(), otherDeductions: otherDeductions?.toString(), netSalary: net.toString(), updatedBy: req.user.id })
        .where(eq(payroll.id, existing[0].id))
        .returning();
    } else {
      [record] = await db.insert(payroll).values({
        employeeId, month, year, basicSalary: basicSalary.toString(), hra: hra?.toString(), transport: transport?.toString(), otherAllowance: otherAllowance?.toString(), grossSalary: gross.toString(), pfDeduction: pfDeduction?.toString(), taxDeduction: taxDeduction?.toString(), otherDeductions: otherDeductions?.toString(), netSalary: net.toString(), updatedBy: req.user.id,
      }).returning();
    }

    // Notify employee
    if (emp?.userId) {
      await db.insert(notifications).values({
        recipientId: emp.userId,
        type: 'payroll_updated',
        title: '💰 Payroll Updated',
        message: `Your payroll for ${month}/${year} has been updated. Net Salary: ₹${net.toLocaleString('en-IN')}`,
        actionUrl: '/payroll',
      });
      if (req.io) {
        req.io.to(`room:employee:${emp.userId}`).emit('payroll:updated', { month, year, netSalary: net });
      }
    }

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: req.user.email,
      action: 'PAYROLL_UPDATED',
      entityType: 'payroll',
      entityId: record.id,
      metadata: { employeeId, month, year, netSalary: net },
    });

    res.json({ record, message: 'Payroll updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update payroll' });
  }
});

export default router;
