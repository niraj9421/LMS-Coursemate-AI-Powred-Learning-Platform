import { Router } from 'express';
import { GamificationController } from '../controllers/gamification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/v1/gamification/stats
router.get('/stats', authenticate, GamificationController.getStats);

// GET /api/v1/gamification/leaderboard?scope=global|course|weekly
router.get('/leaderboard', authenticate, GamificationController.getLeaderboard);

export default router;
