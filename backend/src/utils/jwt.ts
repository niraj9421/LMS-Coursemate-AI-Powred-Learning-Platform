import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';

// ─── Payload shape ────────────────────────────────────────────────────────────

export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  role: 'admin' | 'teacher' | 'student';
  email: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
}

// ─── Sign helpers ─────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<AccessTokenPayload, keyof JwtPayload>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

// ─── Verify helpers ───────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

// ─── Signed URL tokens (email verification, password reset) ──────────────────

export function signEmailToken(payload: Record<string, unknown>, expiresIn = '24h'): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn } as SignOptions);
}

export function verifyEmailToken(token: string): JwtPayload & Record<string, unknown> {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload & Record<string, unknown>;
}
