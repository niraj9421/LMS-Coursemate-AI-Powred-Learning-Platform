import 'dotenv/config';
import http from 'http';
import compression from 'compression';
import { env } from './config/env';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { connectDatabase } from './config/database';
import { logger, morganStream } from './utils/logger';
import { globalErrorHandler } from './middleware/errorHandler';
import { initSocketServer } from './config/socket';
import { startDeadlineReminderJob } from './jobs/deadlineReminder.job';
import { startAssignmentReminderJob } from './jobs/assignmentReminder.job';
import { startAnalyticsSnapshotJob } from './jobs/analyticsSnapshot.job';
import { startNewsFeedJob } from './jobs/newsFeed.job';
import apiRoutes from './routes';

const app: Application = express();

// ─── Compression (gzip/Brotli) — Phase 9 ─────────────────────────────────────
app.use(compression({ threshold: 1024 })); // compress responses > 1KB

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
// Sets a comprehensive set of HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Only allow requests from origins listed in ALLOWED_ORIGINS env var
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header) in non-production
      if (!origin && env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // Allow any Netlify subdomain (covers preview deploys like abc123--site.netlify.app)
      if (origin && origin.endsWith('.netlify.app')) {
        return callback(null, true);
      }

      if (origin && env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`CORS: origin '${origin ?? 'unknown'}' is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Request Logger (Morgan → Winston) ───────────────────────────────────────
// Use 'combined' format in production for full Apache-style logs; 'dev' otherwise
const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { stream: morganStream }));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'LMS Coursemate API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(globalErrorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  // Connect to MongoDB before accepting traffic
  await connectDatabase();

  const httpServer = http.createServer(app);

  // Initialize Socket.io (Task 10.5)
  initSocketServer(httpServer);

  // Start cron jobs (Tasks 7.5, 10.7, 11.1, 17.8)
  startDeadlineReminderJob();
  startAssignmentReminderJob();
  startAnalyticsSnapshotJob();
  startNewsFeedJob();

  // ─── Listen ────────────────────────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    logger.info(`LMS Coursemate API running on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Health check: http://localhost:${env.PORT}/health`);
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Kill the process using it and restart.`);
    } else {
      logger.error('Server error:', err);
    }
    process.exit(1);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err: unknown) => {
  logger.error('Fatal startup error:', { error: err });
  process.exit(1);
});

export default app;
