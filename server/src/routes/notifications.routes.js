import express from 'express';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    const all = await db.select().from(notifications).where(eq(notifications.recipientId, req.user.id));
    const unreadCount = all.filter(n => !n.isRead).length;

    res.json({ notifications: notifs, unreadCount, total: all.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.recipientId, req.user.id)));
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all/mark', authenticate, async (req, res) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipientId, req.user.id));
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

export default router;
