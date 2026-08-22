import express from 'express';
import { db } from '../db/index.js';
import { employees, users, departments, payroll, leaveBalances, leaveTypes, auditLogs } from '../db/schema.js';
import { eq, like, and, or, ilike } from 'drizzle-orm';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

// GET /api/employees — HR only, with search and pagination
router.get('/', authenticate, requireHR, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20, departmentId, status = 'active' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await db
      .select({
        id: employees.id,
        userId: employees.userId,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: employees.designation,
        phone: employees.phone,
        joinDate: employees.joinDate,
        profilePictureUrl: employees.profilePictureUrl,
        status: employees.status,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        email: users.email,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .limit(parseInt(limit))
      .offset(offset);

    const filtered = result.filter(e => {
      const matchesSearch = !search ||
        e.firstName?.toLowerCase().includes(search.toLowerCase()) ||
        e.lastName?.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
        e.email?.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !departmentId || e.departmentId === departmentId;
      const matchesStatus = !status || e.status === status;
      return matchesSearch && matchesDept && matchesStatus;
    });

    res.json({ employees: filtered, total: filtered.length, page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id — Own profile or HR
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingEmployee = await db.select().from(employees).where(eq(employees.userId, req.user.id)).limit(1);
    const myEmpId = requestingEmployee[0]?.id;

    if (req.user.role !== 'hr_admin' && myEmpId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [emp] = await db
      .select({
        id: employees.id,
        userId: employees.userId,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: employees.designation,
        phone: employees.phone,
        address: employees.address,
        joinDate: employees.joinDate,
        profilePictureUrl: employees.profilePictureUrl,
        status: employees.status,
        departmentId: employees.departmentId,
        emergencyContact: employees.emergencyContact,
        departmentName: departments.name,
        email: users.email,
        role: users.role,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(users, eq(employees.userId, users.id))
      .where(eq(employees.id, id))
      .limit(1);

    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    // Get leave balances
    const balances = await db
      .select({
        id: leaveBalances.id,
        total: leaveBalances.total,
        used: leaveBalances.used,
        remaining: leaveBalances.remaining,
        leaveTypeName: leaveTypes.name,
        leaveTypeIcon: leaveTypes.icon,
        leaveTypeColor: leaveTypes.colorCode,
      })
      .from(leaveBalances)
      .leftJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(eq(leaveBalances.employeeId, id));

    res.json({ ...emp, leaveBalances: balances });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// PUT /api/employees/:id — Update employee
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [myEmp] = await db.select().from(employees).where(eq(employees.userId, req.user.id)).limit(1);

    const isHR = req.user.role === 'hr_admin';
    const isOwner = myEmp?.id === id;

    if (!isHR && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Employees can only update certain fields
    let updateData = {};
    if (isHR) {
      const { firstName, lastName, designation, phone, address, departmentId, joinDate, emergencyContact, status, profilePictureUrl } = req.body;
      updateData = { firstName, lastName, designation, phone, address, departmentId, joinDate, emergencyContact, status, profilePictureUrl };
    } else {
      const { phone, address, emergencyContact, profilePictureUrl } = req.body;
      updateData = { phone, address, emergencyContact, profilePictureUrl };
    }

    // Remove undefined
    Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);
    updateData.updatedAt = new Date();

    const [updated] = await db.update(employees).set(updateData).where(eq(employees.id, id)).returning();

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: `${myEmp?.firstName || ''} ${myEmp?.lastName || ''}`.trim() || req.user.email,
      action: 'PROFILE_UPDATED',
      entityType: 'employee',
      entityId: id,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// POST /api/employees — HR only: add new employee
router.post('/', authenticate, requireHR, async (req, res) => {
  try {
    const { email, firstName, lastName, departmentId, designation, phone, joinDate } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const tempPassword = 'Dayflow@' + Math.floor(1000 + Math.random() * 9000);
    const { default: bcrypt } = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      role: 'employee',
      emailVerified: true,
    }).returning();

    const count = await db.select().from(employees);
    const empCode = `EMP-${String(2000 + count.length + 1).padStart(4, '0')}`;

    const [newEmp] = await db.insert(employees).values({
      userId: newUser.id,
      employeeCode: empCode,
      firstName,
      lastName,
      departmentId,
      designation,
      phone,
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      status: 'active',
    }).returning();

    await db.insert(auditLogs).values({
      actorId: req.user.id,
      actorName: req.user.email,
      action: 'EMPLOYEE_ADDED',
      entityType: 'employee',
      entityId: newEmp.id,
      metadata: { employeeName: `${firstName} ${lastName}`, tempPassword },
    });

    res.status(201).json({
      employee: newEmp,
      tempPassword, // Send back for HR to share with employee
      message: `Employee created. Temp password: ${tempPassword}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// GET /api/employees/departments/all
router.get('/meta/departments', async (req, res) => {
  try {
    const depts = await db.select().from(departments);
    res.json(depts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

export default router;
