import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signEmailToken,
  verifyEmailToken,
} from '../utils/jwt';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './email.service';
import type {
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
} from '../validators/auth.validator';

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TOKEN_BLACKLIST_PREFIX = 'blacklist:refresh:';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blacklistKey(token: string): string {
  // Hash the token so we don't store raw JWTs in Redis
  return REFRESH_TOKEN_BLACKLIST_PREFIX + crypto.createHash('sha256').update(token).digest('hex');
}

async function isBlacklisted(token: string): Promise<boolean> {
  const val = await redisClient.get(blacklistKey(token));
  return val !== null;
}

async function blacklistToken(token: string): Promise<void> {
  await redisClient.set(blacklistKey(token), '1', 'EX', REFRESH_TOKEN_TTL_SECONDS);
}

function issueTokenPair(userId: string, role: 'admin' | 'teacher' | 'student', email: string) {
  const accessToken = signAccessToken({ userId, role, email });
  const refreshToken = signRefreshToken(userId);
  return { accessToken, refreshToken };
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const AuthService = {

  // ── Register ────────────────────────────────────────────────────────────────
  async register(data: RegisterInput) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const verificationToken = signEmailToken({ purpose: 'email-verify', email: data.email }, '24h');

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      emailVerificationToken: verificationToken,
      // Auto-verify in development so users can login immediately
      isEmailVerified: env.NODE_ENV === 'development',
    });

    if (env.NODE_ENV !== 'development') {
      // Send verification email only in production
      sendVerificationEmail(user.email, user.name, verificationToken).catch((err: unknown) =>
        logger.error('[auth] Failed to send verification email', { err }),
      );
    }

    return {
      message: env.NODE_ENV === 'development'
        ? 'Registration successful. You can now log in.'
        : 'Registration successful. Please check your email to verify your account.',
      userId: user._id,
    };
  },

  // ── Verify Email ─────────────────────────────────────────────────────────────
  async verifyEmail(token: string) {
    let payload: Record<string, unknown>;
    try {
      payload = verifyEmailToken(token);
    } catch {
      throw new ApiError(400, 'Invalid or expired verification link.');
    }

    if (payload['purpose'] !== 'email-verify') {
      throw new ApiError(400, 'Invalid token purpose.');
    }

    const user = await User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken');
    if (!user) {
      throw new ApiError(400, 'Invalid or already used verification link.');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return { message: 'Email verified successfully. You can now log in.' };
  },

  // ── Login ────────────────────────────────────────────────────────────────────
  async login(data: LoginInput) {
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
    if (!user) {
      // Generic message — no user enumeration
      throw new ApiError(401, 'Invalid email or password.');
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    if (!user.isEmailVerified) {
      // In development, allow login without email verification for easier testing
      if (env.NODE_ENV === 'production') {
        throw new ApiError(403, 'Please verify your email address before logging in.');
      }
    }

    const tokens = issueTokenPair(user._id.toString(), user.role, user.email);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        gamification: user.gamification,
      },
      ...tokens,
    };
  },

  // ── Refresh Token ─────────────────────────────────────────────────────────────
  async refreshToken(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token.');
    }

    if (await isBlacklisted(token)) {
      throw new ApiError(401, 'Refresh token has been revoked. Please log in again.');
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new ApiError(401, 'User not found.');
    }

    // Blacklist the old refresh token (token rotation)
    await blacklistToken(token);

    const tokens = issueTokenPair(user._id.toString(), user.role, user.email);
    return tokens;
  },

  // ── Logout ────────────────────────────────────────────────────────────────────
  async logout(refreshToken: string) {
    try {
      verifyRefreshToken(refreshToken);
    } catch {
      // Token already expired — still blacklist it for safety
    }
    await blacklistToken(refreshToken);
    return { message: 'Logged out successfully.' };
  },

  // ── Google OAuth ──────────────────────────────────────────────────────────────
  async googleAuth(data: GoogleAuthInput) {
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: data.idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
    } catch {
      throw new ApiError(401, 'Invalid Google ID token.');
    }

    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email) {
      throw new ApiError(400, 'Could not retrieve email from Google token.');
    }

    const { email, name, sub: googleId, picture } = googlePayload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    } else {
      // Create new user via Google OAuth
      user = await User.create({
        name: name ?? email.split('@')[0],
        email: email.toLowerCase(),
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS),
        googleId,
        avatar: picture ?? '',
        isEmailVerified: true, // Google accounts are pre-verified
      });
    }

    const tokens = issueTokenPair(user._id.toString(), user.role, user.email);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        gamification: user.gamification,
      },
      ...tokens,
    };
  },

  // ── Forgot Password ───────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent user enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const resetToken = signEmailToken({ purpose: 'password-reset', userId: user._id.toString() }, '1h');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    sendPasswordResetEmail(user.email, user.name, resetToken).catch((err: unknown) =>
      logger.error('[auth] Failed to send password reset email', { err }),
    );

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  },

  // ── Reset Password ────────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    let payload: Record<string, unknown>;
    try {
      payload = verifyEmailToken(token);
    } catch {
      throw new ApiError(400, 'Invalid or expired reset link.');
    }

    if (payload['purpose'] !== 'password-reset') {
      throw new ApiError(400, 'Invalid token purpose.');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset link.');
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return { message: 'Password reset successfully. You can now log in.' };
  },
};
