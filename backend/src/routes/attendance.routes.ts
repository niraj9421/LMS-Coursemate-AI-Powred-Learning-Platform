import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/session', authenticate, authorize('teacher', 'admin'), AttendanceController.createSession);
router.post('/mark', authenticate, authorize('student'), AttendanceController.markAttendance);
router.get('/:courseId', authenticate, authorize('teacher', 'admin'), AttendanceController.getCourseAttendance);
router.get('/:courseId/export', authenticate, authorize('teacher', 'admin'), AttendanceController.exportAttendance);

export default router;
