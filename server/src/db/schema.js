import { pgTable, text, integer, boolean, timestamp, decimal, jsonb, pgEnum, date, time, uuid } from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['employee', 'hr_admin']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'half_day', 'on_leave', 'weekend', 'holiday']);
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'under_review', 'approved', 'rejected']);
export const employeeStatusEnum = pgEnum('employee_status', ['active', 'inactive']);
export const notifTypeEnum = pgEnum('notification_type', ['leave_approved', 'leave_rejected', 'leave_submitted', 'attendance_alert', 'payroll_updated', 'employee_added', 'missing_checkout', 'general']);

// ─── Departments ──────────────────────────────────────────────────────────────
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('employee'),
  emailVerified: boolean('email_verified').default(false),
  emailVerifyToken: text('email_verify_token'),
  emailVerifyExpiry: timestamp('email_verify_expiry'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Employees ────────────────────────────────────────────────────────────────
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  employeeCode: text('employee_code').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  designation: text('designation'),
  phone: text('phone'),
  address: text('address'),
  joinDate: date('join_date'),
  profilePictureUrl: text('profile_picture_url'),
  status: employeeStatusEnum('status').default('active'),
  emergencyContact: text('emergency_contact'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Leave Types ──────────────────────────────────────────────────────────────
export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  daysAllowed: integer('days_allowed').notNull().default(10),
  colorCode: text('color_code').default('#6366f1'),
  isPaid: boolean('is_paid').default(true),
  icon: text('icon').default('📅'),
});

// ─── Leave Balances ───────────────────────────────────────────────────────────
export const leaveBalances = pgTable('leave_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  leaveTypeId: uuid('leave_type_id').references(() => leaveTypes.id),
  year: integer('year').notNull(),
  total: integer('total').notNull(),
  used: integer('used').notNull().default(0),
  remaining: integer('remaining').notNull(),
});

// ─── Leave Requests ───────────────────────────────────────────────────────────
export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  leaveTypeId: uuid('leave_type_id').references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  daysCount: integer('days_count').notNull(),
  reason: text('reason'),
  status: leaveStatusEnum('status').default('pending'),
  hrComment: text('hr_comment'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  checkInTime: timestamp('check_in_time'),
  checkOutTime: timestamp('check_out_time'),
  status: attendanceStatusEnum('status').default('absent'),
  isLate: boolean('is_late').default(false),
  missingCheckout: boolean('missing_checkout').default(false),
  workHours: decimal('work_hours', { precision: 4, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Payroll ──────────────────────────────────────────────────────────────────
export const payroll = pgTable('payroll', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  basicSalary: decimal('basic_salary', { precision: 10, scale: 2 }).notNull(),
  hra: decimal('hra', { precision: 10, scale: 2 }).default('0'),
  transport: decimal('transport', { precision: 10, scale: 2 }).default('0'),
  otherAllowance: decimal('other_allowance', { precision: 10, scale: 2 }).default('0'),
  grossSalary: decimal('gross_salary', { precision: 10, scale: 2 }).notNull(),
  pfDeduction: decimal('pf_deduction', { precision: 10, scale: 2 }).default('0'),
  taxDeduction: decimal('tax_deduction', { precision: 10, scale: 2 }).default('0'),
  otherDeductions: decimal('other_deductions', { precision: 10, scale: 2 }).default('0'),
  netSalary: decimal('net_salary', { precision: 10, scale: 2 }).notNull(),
  generatedAt: timestamp('generated_at').defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }),
  type: notifTypeEnum('type').default('general'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  actionUrl: text('action_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id),
  actorName: text('actor_name'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const holidays = pgTable('holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  date: date('date').notNull().unique(),
  isOptional: boolean('is_optional').default(false),
});

// ─── AI Interaction Logs ──────────────────────────────────────────────────────
export const aiInteractions = pgTable('ai_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  query: text('query').notNull(),
  response: text('response'),
  toolsUsed: jsonb('tools_used'),
  createdAt: timestamp('created_at').defaultNow(),
});
