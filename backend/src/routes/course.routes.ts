import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadImage } from '../middleware/upload';
import {
  createCourseSchema,
  updateCourseSchema,
  createChapterSchema,
  rateCourseSchema,
} from '../validators/course.validator';

const router = Router();

// ── Public / optional-auth routes ────────────────────────────────────────────
router.get('/', CourseController.getCourses);
router.get('/recommended', authenticate, CourseController.getRecommended);
router.get('/:id', CourseController.getCourse);

// ── Teacher / Admin routes ────────────────────────────────────────────────────
router.post('/',
  authenticate, authorize('teacher', 'admin'),
  uploadImage.single('thumbnail'),
  validate(createCourseSchema),
  CourseController.createCourse,
);

// ── Thumbnail upload (separate from course update) ───────────────────────────
router.post('/:id/thumbnail',
  authenticate, authorize('teacher', 'admin'),
  uploadImage.single('thumbnail'),
  CourseController.uploadThumbnail,
);

router.put('/:id',
  authenticate, authorize('teacher', 'admin'),
  uploadImage.single('thumbnail'),
  validate(updateCourseSchema),
  CourseController.updateCourse,
);

router.delete('/:id',
  authenticate, authorize('teacher', 'admin'),
  CourseController.deleteCourse,
);

router.post('/:id/publish',
  authenticate, authorize('teacher', 'admin'),
  CourseController.publishCourse,
);

// ── Student routes ────────────────────────────────────────────────────────────
router.post('/:id/enroll',
  authenticate, authorize('student'),
  CourseController.enrollStudent,
);

router.get('/:id/progress',
  authenticate,
  CourseController.getCourseProgress,
);

router.post('/:id/rate',
  authenticate, authorize('student'),
  validate(rateCourseSchema),
  CourseController.rateCourse,
);

// ── Chapter routes ────────────────────────────────────────────────────────────
router.post('/:id/chapters',
  authenticate, authorize('teacher', 'admin'),
  validate(createChapterSchema),
  CourseController.createChapter,
);

export default router;
