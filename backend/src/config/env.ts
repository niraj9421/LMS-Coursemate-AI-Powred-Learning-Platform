import { z } from 'zod';

// ─── Schema ───────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────────────
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // ── MongoDB ─────────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URL'),

  // ── Redis ───────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),

  // ── JWT ─────────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // ── Cloudinary ──────────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // ── Email (SMTP) ─────────────────────────────────────────────────────────────
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z
    .string()
    .default('587')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address'),

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

  // ── AI Services ──────────────────────────────────────────────────────────────
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  OPENAI_API_KEY: z.string().optional(),

  // ── News API ─────────────────────────────────────────────────────────────────
  NEWS_API_KEY: z.string().min(1, 'NEWS_API_KEY is required'),

  // ── App URLs ─────────────────────────────────────────────────────────────────
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_BASE_URL: z.string().url().default('http://localhost:5000'),

  // ── CORS ─────────────────────────────────────────────────────────────────────
  // Comma-separated list of allowed origins, e.g. "http://localhost:5173,https://app.example.com"
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((val) => val.split(',').map((o) => o.trim()).filter(Boolean)),
});

// ─── Validation ───────────────────────────────────────────────────────────────

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const formatted = result.error.issues
    .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `[env] Environment variable validation failed:\n${formatted}\n\n` +
      'Please check your .env file against .env.example.',
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/** Validated and typed environment variables. */
export const env = result.data;

/** TypeScript type for the validated environment object. */
export type Env = typeof env;
