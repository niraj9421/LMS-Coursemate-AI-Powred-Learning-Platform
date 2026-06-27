import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/apiError';

// ─── Extend Express Request ───────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// ─── authenticate ─────────────────────────────────────────────────────────────

/**
 * Extracts and verifies the JWT from the `Authorization: Bearer <token>` header.
 * Attaches the decoded payload to `req.user`.
 * Returns 401 if the token is missing, malformed, or expired.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required. Please provide a valid token.'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token. Please log in again.'));
  }
}

// ─── authorize ────────────────────────────────────────────────────────────────

/**
 * Role-based access control middleware factory.
 * Must be used after `authenticate`.
 * Checks JWT role first, then verifies against DB for critical mismatches.
 */
export function authorize(...roles: Array<'admin' | 'teacher' | 'student'>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    // Fast path — JWT role matches
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Slow path — JWT role doesn't match, check DB in case role was updated since token was issued
    try {
      const { User } = await import('../models/User');
      const freshUser = await User.findById(req.user.userId).select('role').lean();
      if (freshUser && roles.includes(freshUser.role as 'admin' | 'teacher' | 'student')) {
        // Update req.user.role to match DB
        req.user.role = freshUser.role as 'admin' | 'teacher' | 'student';
        return next();
      }
    } catch {
      // DB check failed — fall through to deny
    }

    return next(
      new ApiError(403, `Access denied. Required role: ${roles.join(' or ')}.`),
    );
  };
}

// ─── rateLimiter ──────────────────────────────────────────────────────────────

/**
 * In-memory rate limiter for auth endpoints.
 * Simple and reliable — no Redis dependency.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
  },
  // Use default in-memory store — no Redis needed for rate limiting
});

/**
 * General-purpose rate limiter (100 req / 15 min per IP).
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});
