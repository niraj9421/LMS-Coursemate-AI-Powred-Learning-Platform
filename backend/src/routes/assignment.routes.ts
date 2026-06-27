import { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createAssignmentSchema } from '../validators/assignment.validator';
import { uploadSubmission, uploadDocument } from '../middleware/upload';

const router = Router();

// POST /api/v1/assignments — teacher/admin only
router.post(
  '/',
  authenticate,
  authorize('teacher', 'admin'),
  uploadDocument.single('referenceFile'),
  validate(createAssignmentSchema),
  AssignmentController.createAssignment,
);

// GET /api/v1/assignments/:id — any authenticated user
router.get(
  '/course/:courseId',
  authenticate,
  authorize('teacher', 'admin'),
  AssignmentController.getCourseAssignments,
);

router.get(
  '/:id',
  authenticate,
  AssignmentController.getAssignment,
);

router.get(
  '/:id/submissions',
  authenticate,
  authorize('teacher', 'admin'),
  AssignmentController.getAssignmentSubmissions,
);

// POST /api/v1/assignments/:id/submit — student only
router.post(
  '/:id/submit',
  authenticate,
  authorize('student'),
  uploadSubmission.single('file'),
  AssignmentController.submitAssignment,
);

export default router;
