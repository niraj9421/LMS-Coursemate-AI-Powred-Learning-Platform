import Redis, { RedisOptions } from 'ioredis';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES              = 5;
const INITIAL_RETRY_DELAY_MS   = 500;   // 0.5 seconds
const MAX_RETRY_DELAY_MS       = 16_000; // 16 seconds

// ─── Logger shim ──────────────────────────────────────────────────────────────
function log(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
  const prefix = '[redis]';
  if (level === 'error') {
    console.error(`${prefix} ${message}`, meta ?? '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, meta ?? '');
  } else {
    console.info(`${prefix} ${message}`, meta ?? '');
  }
}

// ─── Exponential backoff retry strategy ───────────────────────────────────────
/**
 * ioredis `retryStrategy` callback.
 * Returns the delay (ms) before the next reconnect attempt, or `null` to stop.
 */
function retryStrategy(times: number): number | null {
  if (times > MAX_RETRIES) {
    log('error', `Max reconnect attempts (${MAX_RETRIES}) reached. Giving up.`);
    return null; // stop retrying
  }
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, times - 1), MAX_RETRY_DELAY_MS);
  log('warn', `Reconnect attempt ${times}/${MAX_RETRIES} in ${delay}ms…`);
  return delay;
}

// ─── Build connection options ─────────────────────────────────────────────────
function buildRedisOptions(): RedisOptions {
  const baseOptions: RedisOptions = {
    retryStrategy,
    // Disable auto-reconnect on explicit QUIT/disconnect calls
    enableOfflineQueue: true,
    lazyConnect: false,
    maxRetriesPerRequest: null, // let retryStrategy handle it
  };

  const redisUrl = process.env['REDIS_URL'];
  if (redisUrl) {
    // REDIS_URL takes precedence (e.g. redis://[:password@]host[:port][/db])
    return { ...baseOptions };
  }

  // Fall back to individual env vars
  const host     = process.env['REDIS_HOST']     ?? 'localhost';
  const port     = parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
  const password = process.env['REDIS_PASSWORD'];

  return {
    ...baseOptions,
    host,
    port,
    ...(password ? { password } : {}),
  };
}

// ─── Singleton client ─────────────────────────────────────────────────────────
function createRedisClient(): Redis {
  const redisUrl = process.env['REDIS_URL'];
  const options  = buildRedisOptions();

  const client = redisUrl
    ? new Redis(redisUrl, options)
    : new Redis(options);

  // ─── Connection event handlers ──────────────────────────────────────────────
  client.on('connect', () => {
    log('info', 'Connecting to Redis…');
  });

  client.on('ready', () => {
    log('info', 'Redis client is ready.');
  });

  client.on('error', (err: Error) => {
    log('error', 'Redis client error.', err.message);
  });

  client.on('close', () => {
    log('warn', 'Redis connection closed.');
  });

  client.on('reconnecting', (delay: number) => {
    log('info', `Redis reconnecting in ${delay}ms…`);
  });

  return client;
}

/**
 * Singleton ioredis instance.
 * Exported directly so it can be passed to `rate-limit-redis` and other
 * libraries that require the raw ioredis client.
 */
export const redisClient: Redis = createRedisClient();

// ─── Cache helper functions ───────────────────────────────────────────────────

/**
 * Retrieve a cached value by key.
 * Returns the parsed value, or `null` if the key does not exist.
 */
export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const raw = await redisClient.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Value was stored as a plain string (not JSON)
    return raw as unknown as T;
  }
}

/**
 * Store a value in the cache with an optional TTL.
 *
 * @param key        Cache key
 * @param value      Any JSON-serialisable value
 * @param ttlSeconds Time-to-live in seconds (omit for no expiry)
 */
export async function setCache<T = unknown>(
  key: string,
  value: T,
  ttlSeconds?: number,
): Promise<void> {
  const serialised = JSON.stringify(value);
  if (ttlSeconds !== undefined && ttlSeconds > 0) {
    await redisClient.set(key, serialised, 'EX', ttlSeconds);
  } else {
    await redisClient.set(key, serialised);
  }
}

/**
 * Delete a single cache entry by key.
 */
export async function deleteCache(key: string): Promise<void> {
  await redisClient.del(key);
}

/**
 * Delete all cache keys matching a glob pattern (e.g. `"courses:*"`).
 *
 * Uses SCAN to avoid blocking the Redis event loop on large keyspaces.
 */
export async function flushPattern(pattern: string): Promise<void> {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redisClient.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100,
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } while (cursor !== '0');
}
