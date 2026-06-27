import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uploadImage } from '../middleware/upload';
import { updateProfileSchema } from '../validators/user.validator';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// ── Authenticated user's own profile ─────────────────────────────────────────
router.get('/me',                   UserController.getMe);
router.put('/me',                   validate(updateProfileSchema), UserController.updateMe);
router.post('/me/avatar',           uploadImage.single('avatar'),  UserController.uploadAvatar);
router.get('/me/analytics',         UserController.getMyAnalytics);
router.get('/me/certificates',      UserController.getMyCertificates);
router.get('/me/enrollments',       UserController.getMyEnrollments);
router.get('/course/:courseId/students', authenticate, authorize('teacher', 'admin'), UserController.getCourseStudents);

// ── Public profile (any authenticated user can view) ─────────────────────────
router.get('/:id/profile',          UserController.getPublicProfile);

export default router;
