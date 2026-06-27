import { Request, Response } from 'express';
import { CodingService } from '../services/coding.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/apiError';

export const CodingController = {

  // GET /api/v1/coding/problems
  getProblems: asyncHandler(async (req: Request, res: Response) => {
    const { difficulty, category, search, page, limit } = req.query as Record<string, string>;
    const result = await CodingService.getProblems({
      difficulty, category, search,
      page: parseInt(page ?? '1'),
      limit: parseInt(limit ?? '20'),
    });
    ApiResponse.success(res, 200, 'Problems fetched', result);
  }),

  // GET /api/v1/coding/problems/:slug
  getProblem: asyncHandler(async (req: Request, res: Response) => {
    const result = await CodingService.getProblem(req.params['slug']!, req.user?.userId);
    ApiResponse.success(res, 200, 'Problem fetched', result);
  }),

  // POST /api/v1/coding/run
  runCode: asyncHandler(async (req: Request, res: Response) => {
    const { problemId, language, code } = req.body as { problemId: string; language: string; code: string };
    if (!problemId || !language || !code) throw new ApiError(400, 'problemId, language, and code are required.');
    const result = await CodingService.runCode(problemId, language, code);
    ApiResponse.success(res, 200, 'Code executed', result);
  }),

  // POST /api/v1/coding/submit
  submitCode: asyncHandler(async (req: Request, res: Response) => {
    const { problemId, language, code } = req.body as { problemId: string; language: string; code: string };
    if (!problemId || !language || !code) throw new ApiError(400, 'problemId, language, and code are required.');
    const submission = await CodingService.submitCode(problemId, req.user!.userId, language, code);
    ApiResponse.success(res, 201, 'Submission recorded', submission);
  }),

  // GET /api/v1/coding/leaderboard
  getLeaderboard: asyncHandler(async (_req: Request, res: Response) => {
    const data = await CodingService.getLeaderboard();
    ApiResponse.success(res, 200, 'Leaderboard fetched', data);
  }),

  // GET /api/v1/coding/stats
  getMyStats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await CodingService.getUserStats(req.user!.userId);
    ApiResponse.success(res, 200, 'Coding stats fetched', stats);
  }),

  // GET /api/v1/coding/daily
  getDailyChallenge: asyncHandler(async (_req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { CodingProblem } = await import('../models/CodingProblem');
    const daily = await CodingProblem.findOne({ isDailyChallenge: true, dailyChallengeDate: { $gte: today } })
      .select('-testCases -solution');
    if (!daily) {
      // Fallback: return a random easy problem
      const count = await CodingProblem.countDocuments({ difficulty: 'easy', isActive: true });
      const rand = Math.floor(Math.random() * count);
      const fallback = await CodingProblem.findOne({ difficulty: 'easy', isActive: true })
        .skip(rand).select('-testCases -solution');
      return ApiResponse.success(res, 200, 'Daily challenge fetched', fallback);
    }
    ApiResponse.success(res, 200, 'Daily challenge fetched', daily);
  }),
};
