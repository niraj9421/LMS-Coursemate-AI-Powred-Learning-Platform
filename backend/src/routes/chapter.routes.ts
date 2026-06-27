import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.put('/:chapterId', authenticate, authorize('teacher', 'admin'), CourseController.updateChapter);
router.delete('/:chapterId', authenticate, authorize('teacher', 'admin'), CourseController.deleteChapter);

export default router;
