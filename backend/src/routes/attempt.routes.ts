import { Router } from 'express';
import { AttemptController } from '../controllers/attempt.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { submitAnswerSchema } from '../validators/quiz.validator';

const router = Router();

// POST /api/v1/attempts/:id/answer — any authenticated user (student)
router.post(
  '/:id/answer',
  authenticate,
  validate(submitAnswerSchema),
  AttemptController.submitAnswer,
);

// POST /api/v1/attempts/:id/submit — any authenticated user (student)
router.post(
  '/:id/submit',
  authenticate,
  AttemptController.submitAttempt,
);

export default router;
