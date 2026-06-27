import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createQuizSchema } from '../validators/quiz.validator';

const router = Router();

// POST /api/v1/quizzes — teacher or admin only
router.post(
  '/',
  authenticate,
  authorize('teacher', 'admin'),
  validate(createQuizSchema),
  QuizController.createQuiz,
);

// GET /api/v1/quizzes/:id — any authenticated user
router.get(
  '/:id',
  authenticate,
  QuizController.getQuiz,
);

// POST /api/v1/quizzes/:id/start — student only
router.post(
  '/:id/start',
  authenticate,
  authorize('student'),
  QuizController.startQuiz,
);

// GET /api/v1/quizzes/:id/leaderboard — any authenticated user
router.get(
  '/:id/leaderboard',
  authenticate,
  QuizController.getLeaderboard,
);

// GET /api/v1/quizzes/:id/analytics — teacher/admin only
router.get(
  '/:id/analytics',
  authenticate,
  authorize('teacher', 'admin'),
  QuizController.getAnalytics,
);

export default router;
