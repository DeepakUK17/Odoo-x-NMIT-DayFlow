import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireHR = (req, res, next) => {
  if (req.user?.role !== 'hr_admin') {
    return res.status(403).json({ error: 'HR Admin access required' });
  }
  next();
};

export const requireOwnerOrHR = (paramKey = 'id') => (req, res, next) => {
  if (req.user?.role === 'hr_admin') return next();
  if (req.user?.id === req.params[paramKey]) return next();
  return res.status(403).json({ error: 'Access denied' });
};
