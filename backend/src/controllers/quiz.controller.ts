import { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const QuizController = {

  // POST /api/v1/quizzes
  createQuiz: asyncHandler(async (req: Request, res: Response) => {
    const quiz = await QuizService.createQuiz(req.body, req.user!.userId);
    ApiResponse.success(res, 201, 'Quiz created', quiz);
  }),

  // GET /api/v1/quizzes/:id
  getQuiz: asyncHandler(async (req: Request, res: Response) => {
    const quiz = await QuizService.getQuizById(req.params['id']!, req.user!.role);
    ApiResponse.success(res, 200, 'Quiz fetched', quiz);
  }),

  // POST /api/v1/quizzes/:id/start — student only
  startQuiz: asyncHandler(async (req: Request, res: Response) => {
    const attempt = await QuizService.startQuiz(req.params['id']!, req.user!.userId);
    ApiResponse.success(res, 201, 'Quiz attempt started', attempt);
  }),

  // GET /api/v1/quizzes/:id/leaderboard
  getLeaderboard: asyncHandler(async (req: Request, res: Response) => {
    const leaderboard = await QuizService.getLeaderboard(req.params['id']!);
    ApiResponse.success(res, 200, 'Leaderboard fetched', leaderboard);
  }),

  // GET /api/v1/quizzes/:id/analytics — teacher/admin only
  getAnalytics: asyncHandler(async (req: Request, res: Response) => {
    const analytics = await QuizService.getQuizAnalytics(req.params['id']!);
    ApiResponse.success(res, 200, 'Quiz analytics fetched', analytics);
  }),
};
