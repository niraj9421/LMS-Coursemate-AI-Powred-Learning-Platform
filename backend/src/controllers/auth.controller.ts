import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const AuthController = {

  // POST /api/v1/auth/register
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body);
    ApiResponse.success(res, 201, result.message, { userId: result.userId });
  }),

  // GET /api/v1/auth/verify-email/:token
  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.verifyEmail(req.params['token'] ?? '');
    ApiResponse.success(res, 200, result.message);
  }),

  // POST /api/v1/auth/login
  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    ApiResponse.success(res, 200, 'Login successful', result);
  }),

  // POST /api/v1/auth/refresh-token
  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await AuthService.refreshToken(refreshToken);
    ApiResponse.success(res, 200, 'Token refreshed', tokens);
  }),

  // POST /api/v1/auth/logout
  logout: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await AuthService.logout(refreshToken ?? '');
    ApiResponse.success(res, 200, result.message);
  }),

  // POST /api/v1/auth/google
  googleAuth: asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.googleAuth(req.body);
    ApiResponse.success(res, 200, 'Google authentication successful', result);
  }),

  // POST /api/v1/auth/forgot-password
  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };
    const result = await AuthService.forgotPassword(email);
    ApiResponse.success(res, 200, result.message);
  }),

  // POST /api/v1/auth/reset-password/:token
  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { password } = req.body as { password: string };
    const result = await AuthService.resetPassword(req.params['token'] ?? '', password);
    ApiResponse.success(res, 200, result.message);
  }),
};
