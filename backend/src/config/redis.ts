import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isRedisConnected = false;

export const initRedis = (): Redis | null => {
  if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null // don't spam retries if redis is not running locally
      });

      redisClient.connect().then(() => {
        isRedisConnected = true;
        console.log('[Redis] Connected successfully');
      }).catch((err) => {
        console.log('[Redis] Optional Redis not available, running without cache:', err.message);
        isRedisConnected = false;
      });

      redisClient.on('error', () => {
        isRedisConnected = false;
      });
    } catch {
      isRedisConnected = false;
    }
  }
  return redisClient;
};

export const getCache = async (key: string): Promise<string | null> => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

export const setCache = async (key: string, value: string, ttlSeconds = 60): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.setex(key, ttlSeconds, value);
  } catch {
    // Graceful fallback: silently ignore cache write failure
  }
};

export const invalidateCache = async (keyPattern: string): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    const keys = await redisClient.keys(keyPattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch {
    // Graceful fallback
  }
};
