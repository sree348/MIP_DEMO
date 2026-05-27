import { Router } from 'express';
import { prisma } from '../services/prisma.service.js';
import { runBrainAnalysis } from '../jobs/brain.job.js';
import { requireJwtAuth, type AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const brainRouter = Router();

// GET /api/v1/brain/insights?clientId=
brainRouter.get('/brain/insights', requireJwtAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const clientId = (req.query.clientId as string) || 'agency';
    
    const insights = await prisma.brainInsight.findMany({
      where: { tenantId: clientId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    return res.json(insights);
  } catch (error) {
    return next(error);
  }
});

// GET /api/v1/brain/scores?clientId=
brainRouter.get('/brain/scores', requireJwtAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const clientId = (req.query.clientId as string) || 'agency';
    
    const scores = await prisma.campaignScore.findMany({
      where: { tenantId: clientId },
      orderBy: { score: 'desc' },
    });
    
    return res.json(scores);
  } catch (error) {
    return next(error);
  }
});

// POST /api/v1/brain/sync
brainRouter.post('/brain/sync', requireJwtAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const clientId = req.body.clientId || 'agency';
    
    await runBrainAnalysis(clientId);
    
    return res.json({ success: true, message: 'AI Brain sync completed successfully.' });
  } catch (error) {
    return next(error);
  }
});
