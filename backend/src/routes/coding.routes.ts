import { Router } from 'express';
import { CodingController } from '../controllers/coding.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public
router.get('/problems',          CodingController.getProblems);
router.get('/problems/:slug',    CodingController.getProblem);
router.get('/leaderboard',       CodingController.getLeaderboard);
router.get('/daily',             CodingController.getDailyChallenge);

// Authenticated
router.post('/run',    authenticate, CodingController.runCode);
router.post('/submit', authenticate, CodingController.submitCode);
router.get('/stats',   authenticate, CodingController.getMyStats);

export default router;
