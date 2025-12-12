/* eslint-disable no-console */
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';

// Redis client with connection options and error handling
let redis: Redis | null = null;
let isRedisAvailable = false;

const createRedisClient = (): Redis => {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // Connection options
    connectTimeout: 10000, // 10 seconds
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      // Stop retrying after 10 attempts
      if (times > 10) {
        console.warn('Redis connection failed after 10 attempts, giving up');
        isRedisAvailable = false;
        return null; // Stop retrying
      }
      const delay = Math.min(times * 100, 3000);
      console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    enableOfflineQueue: false, // Disable offline queue to fail fast
    lazyConnect: true, // Enable lazy connection
  });

  // Event listeners for connection status
  client.on('connect', () => {
    console.log('Redis client connected successfully');
    isRedisAvailable = true;
  });

  client.on('ready', () => {
    console.log('Redis client ready to accept commands');
  });

  client.on('error', (err: Error) => {
    console.error('Redis client error:', err.message);
    isRedisAvailable = false;
  });

  client.on('close', () => {
    console.warn('Redis client connection closed');
    isRedisAvailable = false;
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  return client;
};

// Lazy initialization of Redis client
const getRedisClient = async (): Promise<Redis | null> => {
  if (!redis) {
    redis = createRedisClient();
    try {
      await redis.connect();
      console.log('Redis client initialized and connected');
    } catch (err) {
      console.error('Failed to connect to Redis:', err instanceof Error ? err.message : err);
      console.warn('Rate limiting will fall back to in-memory store');
      redis = null;
      return null;
    }
  }
  return redis;
};

// Initialize Redis connection (non-blocking)
getRedisClient().catch((err) => {
  console.error('Redis initialization error:', err);
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  if (redis) {
    try {
      console.log('Closing Redis connection...');
      await redis.quit();
      console.log('Redis connection closed gracefully');
    } catch (err) {
      console.error('Error closing Redis connection:', err);
      redis.disconnect();
    }
  }
};

// Register shutdown handlers
process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('beforeExit', async () => {
  await gracefulShutdown();
});

// Rate limiter with fallback to in-memory store if Redis is unavailable
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => {
    // Skip rate limiting in development if Redis is unavailable
    if (process.env.NODE_ENV === 'development' && !isRedisAvailable) {
      return true;
    }
    return false;
  },
});

export const strictRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5,
  message: 'Too many requests, please slow down.',
  skip: (_req) => {
    // Skip rate limiting in development if Redis is unavailable
    if (process.env.NODE_ENV === 'development' && !isRedisAvailable) {
      return true;
    }
    return false;
  },
});
