import dotenv from 'dotenv';
dotenv.config();
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const {
  departments, users, employees, leaveTypes, leaveBalances,
  leaveRequests, attendance, payroll, notifications, auditLogs, holidays
} = schema;

async function seed() {
  console.log('🌱 Seeding DAYFLOW database...');

  // ─── Departments ────────────────────────────────────────────────────────────
  console.log('Creating departments...');
  const deptData = await db.insert(departments).values([
    { name: 'Engineering', code: 'ENG' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Sales & Marketing', code: 'SAL' },
  ]).returning();
  const [engDept, hrDept, finDept, salDept] = deptData;

  // ─── Leave Types ────────────────────────────────────────────────────────────
  console.log('Creating leave types...');
  const ltData = await db.insert(leaveTypes).values([
    { name: 'Casual Leave', daysAllowed: 12, colorCode: '#6366f1', isPaid: true, icon: '🏖' },
    { name: 'Sick Leave', daysAllowed: 10, colorCode: '#f59e0b', isPaid: true, icon: '🤒' },
    { name: 'Personal Leave', daysAllowed: 6, colorCode: '#8b5cf6', isPaid: true, icon: '📅' },
    { name: 'Unpaid Leave', daysAllowed: 30, colorCode: '#ef4444', isPaid: false, icon: '📋' },
  ]).returning();
  const [casualLT, sickLT, personalLT, unpaidLT] = ltData;

  // ─── HR Admin User ──────────────────────────────────────────────────────────
  console.log('Creating HR admin...');
  const hrHash = await bcrypt.hash('Hr@dayflow2026', 10);
  const [hrUser] = await db.insert(users).values({
    email: 'hr@dayflow.com',
    passwordHash: hrHash,
    role: 'hr_admin',
    emailVerified: true,
  }).returning();

  const [hrEmployee] = await db.insert(employees).values({
    userId: hrUser.id,
    employeeCode: 'EMP-0001',
    firstName: 'Priya',
    lastName: 'Sharma',
    departmentId: hrDept.id,
    designation: 'HR Manager',
    phone: '+91 9876543210',
    address: '12, MG Road, Bengaluru, Karnataka',
    joinDate: '2023-01-15',
    status: 'active',
  }).returning();

  // ─── Employee Users ─────────────────────────────────────────────────────────
  console.log('Creating employees...');
  const empPass = await bcrypt.hash('Emp@dayflow2026', 10);

  const employeeSeeds = [
    { email: 'deepak@dayflow.com', code: 'EMP-1024', first: 'Deepak', last: 'U K', dept: engDept.id, designation: 'Software Engineer', phone: '+91 9845612345', joinDate: '2024-02-01' },
    { email: 'aishwarya@dayflow.com', code: 'EMP-1025', first: 'Aishwarya', last: 'M', dept: engDept.id, designation: 'AI/ML Engineer', phone: '+91 9845698765', joinDate: '2024-02-01' },
    { email: 'arun@dayflow.com', code: 'EMP-1026', first: 'Arun', last: 'Kumar', dept: engDept.id, designation: 'Backend Developer', phone: '+91 9876501234', joinDate: '2023-06-10' },
    { email: 'priya.emp@dayflow.com', code: 'EMP-1027', first: 'Priya', last: 'Nair', dept: finDept.id, designation: 'Financial Analyst', phone: '+91 9845000123', joinDate: '2023-08-15' },
    { email: 'karthik@dayflow.com', code: 'EMP-1028', first: 'Karthik', last: 'Raja', dept: salDept.id, designation: 'Sales Executive', phone: '+91 9876512345', joinDate: '2023-03-20' },
    { email: 'meera@dayflow.com', code: 'EMP-1029', first: 'Meera', last: 'Singh', dept: engDept.id, designation: 'Frontend Developer', phone: '+91 9000011111', joinDate: '2024-01-05' },
    { email: 'rahul@dayflow.com', code: 'EMP-1030', first: 'Rahul', last: 'Verma', dept: finDept.id, designation: 'Accountant', phone: '+91 9000022222', joinDate: '2022-11-01' },
    { email: 'divya@dayflow.com', code: 'EMP-1031', first: 'Divya', last: 'Krishnan', dept: salDept.id, designation: 'Marketing Manager', phone: '+91 9000033333', joinDate: '2022-05-15' },
    { email: 'suresh@dayflow.com', code: 'EMP-1032', first: 'Suresh', last: 'Babu', dept: engDept.id, designation: 'DevOps Engineer', phone: '+91 9000044444', joinDate: '2023-09-01' },
    { email: 'kavita@dayflow.com', code: 'EMP-1033', first: 'Kavita', last: 'Reddy', dept: hrDept.id, designation: 'HR Executive', phone: '+91 9000055555', joinDate: '2024-03-10' },
  ];

  const createdUsers = [];
  const createdEmployees = [];

  for (const seed of employeeSeeds) {
    const [u] = await db.insert(users).values({
      email: seed.email,
      passwordHash: empPass,
      role: 'employee',
      emailVerified: true,
    }).returning();
    createdUsers.push(u);

    const [e] = await db.insert(employees).values({
      userId: u.id,
      employeeCode: seed.code,
      firstName: seed.first,
      lastName: seed.last,
      departmentId: seed.dept,
      designation: seed.designation,
      phone: seed.phone,
      address: 'Bengaluru, Karnataka',
      joinDate: seed.joinDate,
      status: 'active',
    }).returning();
    createdEmployees.push(e);
  }

  const [deepakEmp, aishwaryaEmp, arunEmp, priyaEmp, karthikEmp, meeraEmp, rahulEmp, divyaEmp, sureshEmp, kavitaEmp] = createdEmployees;

  // ─── Leave Balances ─────────────────────────────────────────────────────────
  console.log('Creating leave balances...');
  const allEmps = [hrEmployee, ...createdEmployees];
  for (const emp of allEmps) {
    await db.insert(leaveBalances).values([
      { employeeId: emp.id, leaveTypeId: casualLT.id, year: 2026, total: 12, used: 2, remaining: 10 },
      { employeeId: emp.id, leaveTypeId: sickLT.id, year: 2026, total: 10, used: 1, remaining: 9 },
      { employeeId: emp.id, leaveTypeId: personalLT.id, year: 2026, total: 6, used: 0, remaining: 6 },
      { employeeId: emp.id, leaveTypeId: unpaidLT.id, year: 2026, total: 30, used: 0, remaining: 30 },
    ]);
  }

  // ─── Payroll Records ─────────────────────────────────────────────────────────
  console.log('Creating payroll records...');
  const payrollData = [
    { emp: hrEmployee, basic: 55000, hra: 22000, transport: 5000, other: 3000 },
    { emp: deepakEmp, basic: 45000, hra: 18000, transport: 4000, other: 2000 },
    { emp: aishwaryaEmp, basic: 45000, hra: 18000, transport: 4000, other: 2000 },
    { emp: arunEmp, basic: 40000, hra: 16000, transport: 3500, other: 1500 },
    { emp: priyaEmp, basic: 42000, hra: 16800, transport: 3500, other: 2000 },
    { emp: karthikEmp, basic: 35000, hra: 14000, transport: 3000, other: 1500 },
    { emp: meeraEmp, basic: 38000, hra: 15200, transport: 3000, other: 1500 },
    { emp: rahulEmp, basic: 36000, hra: 14400, transport: 3000, other: 1000 },
    { emp: divyaEmp, basic: 48000, hra: 19200, transport: 4000, other: 2500 },
    { emp: sureshEmp, basic: 50000, hra: 20000, transport: 4500, other: 2500 },
    { emp: kavitaEmp, basic: 30000, hra: 12000, transport: 2500, other: 1000 },
  ];

  for (const p of payrollData) {
    const gross = p.basic + p.hra + p.transport + p.other;
    const pf = Math.round(p.basic * 0.12);
    const tax = Math.round(gross * 0.05);
    const net = gross - pf - tax;
    await db.insert(payroll).values({
      employeeId: p.emp.id,
      month: 8,
      year: 2026,
      basicSalary: p.basic.toString(),
      hra: p.hra.toString(),
      transport: p.transport.toString(),
      otherAllowance: p.other.toString(),
      grossSalary: gross.toString(),
      pfDeduction: pf.toString(),
      taxDeduction: tax.toString(),
      otherDeductions: '0',
      netSalary: net.toString(),
      updatedBy: hrUser.id,
    });
  }

  // ─── Attendance Records (last 30 days) ───────────────────────────────────────
  console.log('Creating attendance records...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Attendance patterns: arun has low attendance (~74%), priya has low (~77%), karthik has low (~79%)
  const patterns = {
    [deepakEmp.id]: { presentRate: 0.92, lateRate: 0.05 },
    [aishwaryaEmp.id]: { presentRate: 0.94, lateRate: 0.03 },
    [arunEmp.id]: { presentRate: 0.72, lateRate: 0.15 },       // LOW - for AI demo
    [priyaEmp.id]: { presentRate: 0.76, lateRate: 0.10 },       // LOW - for AI demo
    [karthikEmp.id]: { presentRate: 0.79, lateRate: 0.12 },     // LOW - for AI demo
    [meeraEmp.id]: { presentRate: 0.90, lateRate: 0.05 },
    [rahulEmp.id]: { presentRate: 0.88, lateRate: 0.08 },
    [divyaEmp.id]: { presentRate: 0.95, lateRate: 0.02 },
    [sureshEmp.id]: { presentRate: 0.91, lateRate: 0.06 },
    [kavitaEmp.id]: { presentRate: 0.85, lateRate: 0.10 },
  };

  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = d.toISOString().split('T')[0];

    for (const emp of createdEmployees) {
      const pattern = patterns[emp.id] || { presentRate: 0.90, lateRate: 0.05 };

      if (isWeekend) {
        await db.insert(attendance).values({
          employeeId: emp.id,
          date: dateStr,
          status: 'weekend',
        });
        continue;
      }

      const rand = Math.random();
      let status = 'absent';
      let checkIn = null;
      let checkOut = null;
      let isLate = false;
      let missingCheckout = false;
      let workHours = null;

      if (rand < pattern.presentRate) {
        status = 'present';
        const baseHour = 9;
        const lateChance = Math.random() < pattern.lateRate;
        isLate = lateChance;
        const checkInHour = lateChance ? baseHour + Math.floor(Math.random() * 2) + 1 : baseHour;
        const checkInMin = Math.floor(Math.random() * 45);

        checkIn = new Date(d);
        checkIn.setHours(checkInHour, checkInMin, 0);

        // Some missing checkouts (especially karthik)
        const missingCheckoutChance = emp.id === karthikEmp.id ? 0.15 : 0.05;
        if (Math.random() < missingCheckoutChance && daysAgo > 0) {
          missingCheckout = true;
        } else {
          checkOut = new Date(d);
          checkOut.setHours(18, Math.floor(Math.random() * 30), 0);
          workHours = ((checkOut - checkIn) / 3600000).toFixed(2);
        }
      } else if (rand < pattern.presentRate + 0.07) {
        status = 'half_day';
        checkIn = new Date(d);
        checkIn.setHours(9, 15, 0);
        checkOut = new Date(d);
        checkOut.setHours(13, 0, 0);
        workHours = '3.75';
      }

      await db.insert(attendance).values({
        employeeId: emp.id,
        date: dateStr,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        status,
        isLate,
        missingCheckout,
        workHours,
      });
    }
  }

  // Today's attendance (most employees checked in)
  const todayStr = today.toISOString().split('T')[0];
  const checkedInToday = [deepakEmp, aishwaryaEmp, meeraEmp, divyaEmp, sureshEmp, kavitaEmp, rahulEmp];
  for (const emp of checkedInToday) {
    const checkIn = new Date(today);
    checkIn.setHours(9, Math.floor(Math.random() * 20), 0);
    await db.insert(attendance).values({
      employeeId: emp.id,
      date: todayStr,
      checkInTime: checkIn,
      status: 'present',
      isLate: false,
    }).onConflictDoNothing();
  }

  // ─── Leave Requests ──────────────────────────────────────────────────────────
  console.log('Creating leave requests...');
  await db.insert(leaveRequests).values([
    // Pending requests
    {
      employeeId: arunEmp.id, leaveTypeId: sickLT.id,
      startDate: '2026-08-25', endDate: '2026-08-27', daysCount: 3,
      reason: 'Fever and medical treatment', status: 'pending',
    },
    {
      employeeId: karthikEmp.id, leaveTypeId: casualLT.id,
      startDate: '2026-08-28', endDate: '2026-08-29', daysCount: 2,
      reason: 'Family function', status: 'pending',
    },
    {
      employeeId: priyaEmp.id, leaveTypeId: personalLT.id,
      startDate: '2026-09-01', endDate: '2026-09-02', daysCount: 2,
      reason: 'Sister\'s wedding ceremony', status: 'pending',
    },
    // Approved
    {
      employeeId: deepakEmp.id, leaveTypeId: casualLT.id,
      startDate: '2026-08-10', endDate: '2026-08-11', daysCount: 2,
      reason: 'Personal work', status: 'approved',
      hrComment: 'Approved. Have a good time!',
      reviewedBy: hrUser.id, reviewedAt: new Date('2026-08-09'),
    },
    {
      employeeId: meeraEmp.id, leaveTypeId: sickLT.id,
      startDate: '2026-08-05', endDate: '2026-08-06', daysCount: 2,
      reason: 'Cold and fever', status: 'approved',
      hrComment: 'Get well soon!',
      reviewedBy: hrUser.id, reviewedAt: new Date('2026-08-04'),
    },
    // Rejected
    {
      employeeId: rahulEmp.id, leaveTypeId: casualLT.id,
      startDate: '2026-08-20', endDate: '2026-08-22', daysCount: 3,
      reason: 'Vacation', status: 'rejected',
      hrComment: 'Month-end closing period. Cannot approve.',
      reviewedBy: hrUser.id, reviewedAt: new Date('2026-08-18'),
    },
  ]);

  // ─── Holidays ────────────────────────────────────────────────────────────────
  console.log('Creating holidays...');
  await db.insert(holidays).values([
    { name: 'Independence Day', date: '2026-08-15', isOptional: false },
    { name: 'Ganesh Chaturthi', date: '2026-08-27', isOptional: false },
    { name: 'Gandhi Jayanti', date: '2026-10-02', isOptional: false },
    { name: 'Diwali', date: '2026-10-20', isOptional: false },
    { name: 'Christmas', date: '2026-12-25', isOptional: false },
  ]);

  // ─── Notifications ───────────────────────────────────────────────────────────
  console.log('Creating notifications...');
  await db.insert(notifications).values([
    {
      recipientId: createdUsers[0].id, // deepak
      type: 'leave_approved',
      title: 'Leave Request Approved',
      message: 'Your casual leave from Aug 10-11 has been approved.',
      isRead: false,
    },
    {
      recipientId: createdUsers[2].id, // arun
      type: 'attendance_alert',
      title: 'Attendance Alert',
      message: 'Your attendance has dropped below 80%. Please regularize.',
      isRead: false,
    },
    {
      recipientId: hrUser.id,
      type: 'leave_submitted',
      title: 'New Leave Request',
      message: 'Arun Kumar submitted a sick leave request for Aug 25-27.',
      isRead: false,
    },
    {
      recipientId: hrUser.id,
      type: 'leave_submitted',
      title: 'New Leave Request',
      message: 'Karthik Raja submitted a casual leave request for Aug 28-29.',
      isRead: false,
    },
    {
      recipientId: hrUser.id,
      type: 'attendance_alert',
      title: 'Missing Checkout Alert',
      message: 'Karthik Raja has 3 instances of missing checkout this month.',
      isRead: false,
    },
  ]);

  // ─── Audit Logs ──────────────────────────────────────────────────────────────
  console.log('Creating audit logs...');
  await db.insert(auditLogs).values([
    { actorId: hrUser.id, actorName: 'Priya Sharma (HR)', action: 'LEAVE_APPROVED', entityType: 'leave_request', metadata: { employeeName: 'Deepak U K' } },
    { actorId: hrUser.id, actorName: 'Priya Sharma (HR)', action: 'EMPLOYEE_ADDED', entityType: 'employee', metadata: { employeeName: 'Kavita Reddy' } },
    { actorId: hrUser.id, actorName: 'Priya Sharma (HR)', action: 'PAYROLL_UPDATED', entityType: 'payroll', metadata: { month: 'August 2026' } },
    { actorId: hrUser.id, actorName: 'Priya Sharma (HR)', action: 'LEAVE_REJECTED', entityType: 'leave_request', metadata: { employeeName: 'Rahul Verma' } },
    { actorId: createdUsers[0].id, actorName: 'Deepak U K', action: 'LOGIN', entityType: 'user' },
    { actorId: createdUsers[1].id, actorName: 'Aishwarya M', action: 'LOGIN', entityType: 'user' },
    { actorId: createdUsers[0].id, actorName: 'Deepak U K', action: 'CHECK_IN', entityType: 'attendance' },
    { actorId: createdUsers[2].id, actorName: 'Arun Kumar', action: 'LEAVE_SUBMITTED', entityType: 'leave_request', metadata: { type: 'Sick Leave' } },
  ]);

  console.log('✅ DAYFLOW database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('  - 4 Departments');
  console.log('  - 11 Users (1 HR + 10 Employees)');
  console.log('  - 30 days of attendance data per employee');
  console.log('  - 6 Leave requests (3 pending, 2 approved, 1 rejected)');
  console.log('  - Payroll for all employees');
  console.log('  - 5 Holidays');
  console.log('\n🔑 Demo Login Credentials:');
  console.log('  HR Admin: hr@dayflow.com / Hr@dayflow2026');
  console.log('  Employee: deepak@dayflow.com / Emp@dayflow2026');
  console.log('  (All employees share password: Emp@dayflow2026)');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
