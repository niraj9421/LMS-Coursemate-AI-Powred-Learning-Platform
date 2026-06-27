import { Request, Response, NextFunction, RequestHandler } from 'express';

// ─── asyncHandler ─────────────────────────────────────────────────────────────

/**
 * Wraps an async Express route handler so that any rejected promise or thrown
 * error is forwarded to Express's `next(err)` — and ultimately to the global
 * error handler — without needing try/catch in every controller.
 *
 * @example
 *   router.get('/courses', asyncHandler(async (req, res) => {
 *     const courses = await CourseService.findAll();
 *     ApiResponse.success(res, 200, 'Courses fetched', courses);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
