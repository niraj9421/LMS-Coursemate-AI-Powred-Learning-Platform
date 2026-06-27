import { Router } from 'express';
import { PlacementController } from '../controllers/placement.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/progress', authenticate, PlacementController.getProgress);
router.get('/resume-builder', authenticate, PlacementController.getResumeBuilder);
router.post('/resume-builder', authenticate, PlacementController.saveResumeBuilder);
router.get('/resume-builder/export', authenticate, PlacementController.exportResumePDF);
router.get('/gd-topics', authenticate, PlacementController.getGDTopics);
router.post('/gd-topics/:id/feedback', authenticate, PlacementController.getGDFeedback);
router.get('/aptitude/:category', authenticate, PlacementController.getAptitudeTest);
router.post('/aptitude/:id/submit', authenticate, PlacementController.submitAptitudeTest);
router.get('/company/:name', authenticate, PlacementController.getCompanyKit);

export default router;
