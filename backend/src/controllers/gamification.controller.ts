import { Request, Response } from 'express';
import { GamificationService } from '../services/gamification.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const GamificationController = {

  // GET /api/v1/gamification/stats
  getStats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await GamificationService.getStats(req.user!.userId);
    ApiResponse.success(res, 200, 'Gamification stats fetched', stats);
  }),

  // GET /api/v1/gamification/leaderboard?scope=global|course|weekly&courseId=...
  getLeaderboard: asyncHandler(async (req: Request, res: Response) => {
    const scope = (req.query['scope'] as string) ?? 'global';
    if (!['global', 'course', 'weekly'].includes(scope)) {
      throw new ApiError(400, 'scope must be global, course, or weekly');
    }
    const courseId = req.query['courseId'] as string | undefined;
    const leaderboard = await GamificationService.getLeaderboard(
      scope as 'global' | 'course' | 'weekly',
      courseId,
    );
    ApiResponse.success(res, 200, 'Leaderboard fetched', leaderboard);
  }),
};
