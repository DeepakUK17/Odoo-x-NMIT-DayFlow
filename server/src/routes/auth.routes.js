import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { users, employees, departments, auditLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendVerificationEmail } from '../services/email.service.js';

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, role = 'employee', firstName, lastName, departmentId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      role: role === 'hr_admin' ? 'hr_admin' : 'employee',
      emailVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpiry: verifyExpiry,
    }).returning();

    // Generate employee code
    const count = await db.select().from(employees);
    const empCode = `EMP-${String(2000 + count.length + 1).padStart(4, '0')}`;

    const [employee] = await db.insert(employees).values({
      userId: user.id,
      employeeCode: empCode,
      firstName,
      lastName,
      departmentId: departmentId || null,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
    }).returning();

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verifyToken).catch(console.error);

    // Audit
    await db.insert(auditLogs).values({
      actorId: user.id,
      actorName: `${firstName} ${lastName}`,
      action: 'SIGNUP',
      entityType: 'user',
    });

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      verifyToken, // Included for hackathon demo / local testing
      userId: user.id,
      employeeCode: empCode,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get employee profile
    const [employee] = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        firstName: employees.firstName,
        lastName: employees.lastName,
        designation: employees.designation,
        profilePictureUrl: employees.profilePictureUrl,
        departmentId: employees.departmentId,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    const token = jwt.sign(
      { userId: user.id, role: user.role, employeeId: employee?.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Audit log
    await db.insert(auditLogs).values({
      actorId: user.id,
      actorName: employee ? `${employee.firstName} ${employee.lastName}` : user.email,
      action: 'LOGIN',
      entityType: 'user',
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        employee: employee || null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerifyToken, token))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (user.emailVerifyExpiry < new Date()) {
      return res.status(400).json({ error: 'Token expired. Please request a new verification.' });
    }

    await db.update(users)
      .set({ emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null })
      .where(eq(users.id, user.id));

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [employee] = await db.select().from(employees).where(eq(employees.userId, user.id)).limit(1);

    res.json({ id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified, employee });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
