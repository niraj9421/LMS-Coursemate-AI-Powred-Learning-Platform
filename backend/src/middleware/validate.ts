import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/apiError';

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * On failure it throws an `ApiError(422)` with field-level details.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new ApiError(422, 'Validation failed', details));
    }
    req.body = result.data as typeof req.body;
    next();
  };
}
