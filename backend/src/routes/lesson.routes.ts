import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { completeLessonSchema } from '../validators/course.validator';

const router = Router();

router.put('/:lessonId', authenticate, authorize('teacher', 'admin'), CourseController.updateLesson);
router.delete('/:lessonId', authenticate, authorize('teacher', 'admin'), CourseController.deleteLesson);
router.post('/:lessonId/complete', authenticate, validate(completeLessonSchema), CourseController.completeLesson);

export default router;
