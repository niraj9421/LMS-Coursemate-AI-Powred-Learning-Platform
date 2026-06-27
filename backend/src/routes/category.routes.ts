import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public read
router.get('/', AdminController.getCategories);

// Admin write
router.post('/', authenticate, authorize('admin'), AdminController.createCategory);
router.put('/:id', authenticate, authorize('admin'), AdminController.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), AdminController.deleteCategory);

export default router;
