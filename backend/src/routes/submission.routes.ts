import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { gradeSubmissionSchema } from '../validators/assignment.validator';

const router = Router();

// PUT /api/v1/submissions/:id/grade — teacher/admin only
router.put(
  '/:id/grade',
  authenticate,
  authorize('teacher', 'admin'),
  validate(gradeSubmissionSchema),
  AssignmentController.gradeSubmission,
);

export default router;
