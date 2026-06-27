import winston from 'winston';

// ─── Log Levels ───────────────────────────────────────────────────────────────
// error > warn > info > http > verbose > debug > silly
// We use: error, warn, info, http, debug

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

// ─── Custom Format (development) ──────────────────────────────────────────────
const devFormat = combine(
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  colorize({ all: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `[${ts}] ${level}: ${message}\n${stack}${metaStr}`
      : `[${ts}] ${level}: ${message}${metaStr}`;
  }),
);

// ─── Production Format (JSON for log aggregators) ─────────────────────────────
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json(),
);

// ─── Determine active log level ───────────────────────────────────────────────
const logLevel =
  process.env['NODE_ENV'] === 'production' ? 'info' : 'debug';

// ─── Transports ───────────────────────────────────────────────────────────────
const transports: winston.transport[] = [
  new winston.transports.Console({
    format:
      process.env['NODE_ENV'] === 'production' ? prodFormat : devFormat,
  }),
];

// In production, also write errors to a dedicated file
if (process.env['NODE_ENV'] === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: prodFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: prodFormat,
    }),
  );
}

// ─── Logger Instance ──────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: logLevel,
  transports,
  // Prevent Winston from exiting on uncaught exceptions
  exitOnError: false,
});

// ─── Morgan Stream ────────────────────────────────────────────────────────────
// Provides a write() method so Morgan can pipe HTTP logs through Winston
export const morganStream = {
  write: (message: string): void => {
    // Morgan appends a newline; trim it before logging
    logger.http(message.trimEnd());
  },
};
