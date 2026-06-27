import { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const AttemptController = {

  // POST /api/v1/attempts/:id/answer
  submitAnswer: asyncHandler(async (req: Request, res: Response) => {
    const attempt = await QuizService.submitAnswer(
      req.params['id']!,
      req.user!.userId,
      req.body,
    );
    ApiResponse.success(res, 200, 'Answer saved', attempt);
  }),

  // POST /api/v1/attempts/:id/submit
  submitAttempt: asyncHandler(async (req: Request, res: Response) => {
    const result = await QuizService.submitAttempt(
      req.params['id']!,
      req.user!.userId,
    );
    ApiResponse.success(res, 200, 'Quiz submitted and evaluated', result);
  }),
};
