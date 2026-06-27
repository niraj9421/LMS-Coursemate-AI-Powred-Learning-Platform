import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const adminOnly = [authenticate, authorize('admin')];

// Users
router.get('/users', ...adminOnly, AdminController.getUsers);
router.put('/users/:id/role', ...adminOnly, AdminController.updateUserRole);
router.delete('/users/:id', ...adminOnly, AdminController.deleteUser);

// Courses
router.get('/courses', ...adminOnly, AdminController.getAllCourses);
router.put('/courses/:id/status', ...adminOnly, AdminController.updateCourseStatus);

// Analytics
router.get('/analytics', ...adminOnly, AdminController.getAdminAnalytics);
router.get('/analytics/export', ...adminOnly, AdminController.exportAnalytics);

export default router;
