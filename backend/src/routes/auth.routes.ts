import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

const router = Router();

// Apply rate limiter to all auth routes
router.use(authRateLimiter);

// ── Public auth routes ────────────────────────────────────────────────────────
router.post('/register',        validate(registerSchema),        AuthController.register);
router.get('/verify-email/:token',                               AuthController.verifyEmail);
router.post('/login',           validate(loginSchema),           AuthController.login);
router.post('/refresh-token',   validate(refreshTokenSchema),    AuthController.refreshToken);
router.post('/logout',          validate(refreshTokenSchema),    AuthController.logout);
router.post('/google',          validate(googleAuthSchema),      AuthController.googleAuth);
router.post('/forgot-password', validate(forgotPasswordSchema),  AuthController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), AuthController.resetPassword);

export default router;
