import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export const audit = (action, entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode < 400) {
      try {
        await db.insert(auditLogs).values({
          actorId: req.user?.id,
          actorName: req.user ? `${req.auditActorName || req.user.email}` : 'System',
          action,
          entityType,
          entityId: req.params?.id || data?.id || null,
          metadata: req.auditMetadata || null,
        });
      } catch (e) {
        // Don't fail the request if audit fails
      }
    }
    return originalJson(data);
  };
  next();
};
