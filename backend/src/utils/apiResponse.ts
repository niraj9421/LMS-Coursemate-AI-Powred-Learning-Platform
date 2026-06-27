import { Response } from 'express';

// ─── Response Envelope Shape ──────────────────────────────────────────────────

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

// ─── ApiResponse ──────────────────────────────────────────────────────────────

/**
 * Helper for sending consistent JSON response envelopes.
 *
 * Success shape:  { success: true,  message, data }
 * Error shape:    { success: false, message, error }
 *
 * @example
 *   ApiResponse.success(res, 200, 'User fetched', user);
 *   ApiResponse.error(res, 400, 'Bad request', validationErrors);
 */
export class ApiResponse {
  /**
   * Send a successful response.
   *
   * @param res     - Express Response object
   * @param status  - HTTP status code (2xx)
   * @param message - Human-readable success message
   * @param data    - Payload to include in the `data` field (optional)
   */
  static success<T = unknown>(
    res: Response,
    status: number,
    message: string,
    data?: T,
  ): void {
    const body: ApiResponseBody<T> = { success: true, message };
    if (data !== undefined) body.data = data;
    res.status(status).json(body);
  }

  /**
   * Send an error response.
   * Prefer throwing `ApiError` inside route handlers so the global error
   * handler can deal with it uniformly. Use this only when you need to
   * send an error response directly (e.g., inside middleware).
   *
   * @param res     - Express Response object
   * @param status  - HTTP status code (4xx / 5xx)
   * @param message - Human-readable error message
   * @param error   - Optional error details (omitted in production)
   */
  static error(
    res: Response,
    status: number,
    message: string,
    error?: unknown,
  ): void {
    const body: ApiResponseBody = { success: false, message };
    if (error !== undefined && process.env['NODE_ENV'] !== 'production') {
      body.error = error;
    }
    res.status(status).json(body);
  }
}
