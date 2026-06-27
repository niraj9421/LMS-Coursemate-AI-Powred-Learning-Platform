import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/v1/notifications
router.get('/', authenticate, NotificationController.getNotifications);

// PUT /api/v1/notifications/read-all — must come before /:id/read
router.put('/read-all', authenticate, NotificationController.markAllRead);

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', authenticate, NotificationController.markRead);

export default router;
