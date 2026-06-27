import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';

// Re-export so existing imports of ApiError from this module keep working
export { ApiError } from '../utils/apiError';

// ─── Error Response Shape ─────────────────────────────────────────────────────

interface ErrorResponseBody {
  success: false;
  message: string;
  error?: unknown;
}

// ─── Global Error Handler ─────────────────────────────────────────────────────

/**
 * Express 4-argument error-handling middleware.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Behaviour:
 *  - ApiError  → uses its statusCode + message; logs at `warn` level
 *  - Mongoose ValidationError → 422 with field details; logs at `warn`
 *  - Mongoose duplicate key (11000) → 409 Conflict; logs at `warn`
 *  - JWT errors → 401 Unauthorized; logs at `warn`
 *  - Everything else → 500 Internal Server Error; logs at `error` with stack
 *
 * In production the raw error/stack is never sent to the client.
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const isProd = process.env['NODE_ENV'] === 'production';

  // ── ApiError (intentional, operational) ────────────────────────────────────
  if (err instanceof ApiError) {
    logger.warn(`[${req.method}] ${req.path} → ${err.statusCode} ${err.message}`, {
      statusCode: err.statusCode,
      details: err.details,
    });

    const body: ErrorResponseBody = {
      success: false,
      message: err.message,
    };

    if (!isProd && err.details !== undefined) {
      body.error = err.details;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // ── Mongoose Validation Error ───────────────────────────────────────────────
  if (isMongooseValidationError(err)) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    logger.warn(`[${req.method}] ${req.path} → 422 Mongoose validation`, { details });

    res.status(422).json({
      success: false,
      message: 'Validation failed',
      error: details,
    } satisfies ErrorResponseBody & { error: unknown });
    return;
  }

  // ── Mongoose Duplicate Key (E11000) ─────────────────────────────────────────
  if (isMongooseDuplicateKeyError(err)) {
    logger.warn(`[${req.method}] ${req.path} → 409 Duplicate key`, {
      keyValue: err.keyValue,
    });

    res.status(409).json({
      success: false,
      message: 'A record with that value already exists',
    } satisfies ErrorResponseBody);
    return;
  }

  // ── JWT Errors ──────────────────────────────────────────────────────────────
  if (isJwtError(err)) {
    logger.warn(`[${req.method}] ${req.path} → 401 ${err.name}`);

    res.status(401).json({
      success: false,
      message:
        err.name === 'TokenExpiredError'
          ? 'Token has expired'
          : 'Invalid token',
    } satisfies ErrorResponseBody);
    return;
  }

  // ── Unknown / Unexpected Error ──────────────────────────────────────────────
  const error = err instanceof Error ? err : new Error(String(err));

  logger.error(`[${req.method}] ${req.path} → 500 Unhandled error`, {
    message: error.message,
    stack: error.stack,
  });

  res.status(500).json({
    success: false,
    message: isProd
      ? 'An unexpected error occurred. Please try again later.'
      : error.message,
    ...(isProd ? {} : { error: error.stack }),
  } satisfies ErrorResponseBody);
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

interface MongooseValidationError {
  name: 'ValidationError';
  errors: Record<string, { path: string; message: string }>;
}

function isMongooseValidationError(err: unknown): err is MongooseValidationError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as MongooseValidationError).name === 'ValidationError' &&
    typeof (err as MongooseValidationError).errors === 'object'
  );
}

interface MongooseDuplicateKeyError {
  code: 11000;
  keyValue: Record<string, unknown>;
}

function isMongooseDuplicateKeyError(err: unknown): err is MongooseDuplicateKeyError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as MongooseDuplicateKeyError).code === 11000
  );
}

interface JwtError extends Error {
  name: 'JsonWebTokenError' | 'TokenExpiredError' | 'NotBeforeError';
}

function isJwtError(err: unknown): err is JwtError {
  return (
    err instanceof Error &&
    ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)
  );
}
