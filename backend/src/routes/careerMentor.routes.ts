import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { CareerMentorService } from '../services/careerMentor.service';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// GET /api/v1/career-mentor — get existing snapshot
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const snapshot = await CareerMentorService.getSnapshot(req.user!.userId);
  ApiResponse.success(res, 200, 'Career mentor snapshot', snapshot);
}));

// POST /api/v1/career-mentor/generate — generate new snapshot
// Body: { interests?: string[], targetRole?: string, workPreference?: string, timeline?: string, resumeText?: string }
router.post('/generate', authenticate, asyncHandler(async (req, res) => {
  const { interests, targetRole, workPreference, timeline, resumeText } = req.body as {
    interests?: string[];
    targetRole?: string;
    workPreference?: string;
    timeline?: string;
    resumeText?: string;
  };
  const snapshot = await CareerMentorService.generate(req.user!.userId, {
    interests, targetRole, workPreference, timeline, resumeText,
  });
  ApiResponse.success(res, 200, 'Career recommendations generated', snapshot);
}));

export default router;
