import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate, authorize } from '../middleware/auth';
import { uploadResume } from '../middleware/upload';

const router = Router();

// POST /api/v1/ai/tutor — student only
router.post('/tutor', authenticate, authorize('student'), AIController.askTutor);

// POST /api/v1/ai/learning-path — student only
router.post('/learning-path', authenticate, authorize('student'), AIController.generateLearningPath);

// POST /api/v1/ai/interview/start — any authenticated user
router.post('/interview/start', authenticate, AIController.startInterview);

// POST /api/v1/ai/interview/:id/answer — any authenticated user
router.post('/interview/:id/answer', authenticate, AIController.submitInterviewAnswer);

// POST /api/v1/ai/resume/analyze — any authenticated user
router.post('/resume/analyze', authenticate, uploadResume.single('resume'), AIController.analyzeResume);

// GET /api/v1/ai/performance/:courseId — student or teacher
router.get('/performance/:courseId', authenticate, AIController.getPerformancePrediction);

// POST /api/v1/ai/project-ideas — any authenticated user
router.post('/project-ideas', authenticate, AIController.generateProjectIdeas);

// POST /api/v1/ai/generate-summary — any authenticated user
router.post('/generate-summary', authenticate, AIController.generateResumeSummary);

export default router;
