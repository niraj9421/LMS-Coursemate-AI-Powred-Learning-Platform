import mongoose from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────
const INITIAL_RETRY_DELAY_MS = 1_000;   // 1 second
const MAX_RETRY_DELAY_MS     = 30_000;  // 30 seconds
const MAX_RETRIES            = 5;

// ─── Logger shim (uses Winston if available, falls back to console) ────────────
function log(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
  const prefix = `[database]`;
  if (level === 'error') {
    console.error(`${prefix} ${message}`, meta ?? '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, meta ?? '');
  } else {
    console.info(`${prefix} ${message}`, meta ?? '');
  }
}

// ─── Exponential backoff helper ───────────────────────────────────────────────
function getBackoffDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Reconnect with exponential backoff ───────────────────────────────────────
async function reconnectWithBackoff(): Promise<void> {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    log('error', 'MONGODB_URI is not set — cannot reconnect.');
    return;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const delay = getBackoffDelay(attempt);
    log('info', `Reconnect attempt ${attempt + 1}/${MAX_RETRIES} in ${delay / 1000}s…`);
    await sleep(delay);

    try {
      await mongoose.connect(uri);
      log('info', 'Reconnected to MongoDB successfully.');
      return;
    } catch (err) {
      log('warn', `Reconnect attempt ${attempt + 1} failed.`, err);
    }
  }

  log('error', `Failed to reconnect after ${MAX_RETRIES} attempts. Giving up.`);
}

// ─── Connection event handlers ────────────────────────────────────────────────
function registerConnectionEvents(): void {
  const conn = mongoose.connection;

  conn.on('connected', () => {
    log('info', `Connected to MongoDB (host: ${conn.host}, db: ${conn.name})`);
  });

  conn.on('error', (err: Error) => {
    log('error', 'MongoDB connection error.', err.message);
  });

  conn.on('disconnected', () => {
    log('warn', 'MongoDB disconnected. Attempting to reconnect…');
    void reconnectWithBackoff();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Connects to MongoDB Atlas using the `MONGODB_URI` environment variable.
 *
 * - Throws immediately if `MONGODB_URI` is not set.
 * - Implements exponential backoff retry on initial connection failure
 *   (starts at 1 s, doubles each attempt, caps at 30 s, max 5 retries).
 * - Registers Mongoose connection event listeners for `connected`, `error`,
 *   and `disconnected` (the last one triggers auto-reconnect).
 * - Returns a Promise that resolves once the connection is established.
 */
export async function connectDatabase(): Promise<void> {
  const uri = process.env['MONGODB_URI'];

  if (!uri) {
    throw new Error(
      'MONGODB_URI environment variable is not set. ' +
      'Please add it to your .env file (see .env.example).'
    );
  }

  // Register event listeners once before the first connect call so that
  // the 'connected' event is captured even on the initial attempt.
  registerConnectionEvents();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri);
      // 'connected' event fires automatically; no need to log here.
      return;
    } catch (err) {
      const delay = getBackoffDelay(attempt);
      log(
        'warn',
        `Initial connection attempt ${attempt + 1}/${MAX_RETRIES} failed. ` +
        `Retrying in ${delay / 1000}s…`,
        err
      );

      if (attempt < MAX_RETRIES - 1) {
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Failed to connect to MongoDB after ${MAX_RETRIES} attempts. ` +
    'Check your MONGODB_URI and network connectivity.'
  );
}
