import express from 'express';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { desc } from 'drizzle-orm';
import { authenticate, requireHR } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit — HR only, paginated
router.get('/', authenticate, requireHR, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    res.json({ logs, total: logs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
