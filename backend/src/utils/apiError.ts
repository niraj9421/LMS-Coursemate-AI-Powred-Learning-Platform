// ─── ApiError ─────────────────────────────────────────────────────────────────

/**
 * Structured error class for intentional API errors.
 * Throw this anywhere in the request pipeline to produce a clean JSON response.
 *
 * @example
 *   throw new ApiError(404, 'Course not found');
 *   throw new ApiError(422, 'Validation failed', { field: 'email' });
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // distinguishes expected errors from bugs

    // Maintain proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
