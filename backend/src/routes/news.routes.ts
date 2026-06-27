import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public read
router.get('/', AdminController.getNews);

// Admin write
router.post('/', authenticate, authorize('admin'), AdminController.createNews);
router.put('/:id', authenticate, authorize('admin'), AdminController.updateNews);
router.delete('/:id', authenticate, authorize('admin'), AdminController.deleteNews);

export default router;
