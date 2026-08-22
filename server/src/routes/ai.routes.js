import express from 'express';
import { processHRQuery, processLeaveAssist, generateProactiveInsights } from '../services/ai.service.js';
import { authenticate, requireHR } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { employees, aiInteractions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// POST /api/ai/query — HR Copilot
router.post('/query', authenticate, requireHR, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Query too short' });
    }

    const { response, toolsUsed } = await processHRQuery(query, req.user.role);

    // Log interaction
    await db.insert(aiInteractions).values({
      userId: req.user.id,
      query,
      response,
      toolsUsed,
    });

    res.json({ response, toolsUsed });
  } catch (err) {
    console.error('AI query error:', err);
    if (err.message?.includes('API_KEY')) {
      return res.status(500).json({ error: 'AI service configuration error' });
    }
    res.status(500).json({ error: 'AI service temporarily unavailable', fallback: true });
  }
});

// POST /api/ai/leave-assist — Employee Leave Assistant
router.post('/leave-assist', authenticate, async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'Input required' });

    const [emp] = await db.select().from(employees).where(eq(employees.userId, req.user.id)).limit(1);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const result = await processLeaveAssist(input, emp.id);
    res.json(result);
  } catch (err) {
    console.error('AI leave assist error:', err);
    res.status(500).json({ error: 'AI leave assistant unavailable' });
  }
});

// GET /api/ai/proactive-insights — HR Command Center auto-insights
router.get('/proactive-insights', authenticate, requireHR, async (req, res) => {
  try {
    const insights = await generateProactiveInsights();
    res.json(insights);
  } catch (err) {
    console.error('Proactive insights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;
