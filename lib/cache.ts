import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisAvailable = false;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('Redis URL not configured, using in-memory cache fallback');
    return null;
  }
  
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true
    });
    
    redisClient.on('connect', () => {
      console.log('Redis connected');
      redisAvailable = true;
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis error:', err.message);
      redisAvailable = false;
    });
    
    redisClient.on('close', () => {
      redisAvailable = false;
    });
    
    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

const memoryCache = new Map<string, { value: any; expiry: number }>();

const MEMORY_CACHE_MAX_SIZE = 1000;

function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, data] of memoryCache.entries()) {
    if (data.expiry < now) {
      memoryCache.delete(key);
    }
  }
  
  if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(memoryCache.keys()).slice(0, memoryCache.size - MEMORY_CACHE_MAX_SIZE);
    keysToDelete.forEach(key => memoryCache.delete(key));
  }
}

setInterval(cleanMemoryCache, 60000);

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  
  if (redis && redisAvailable) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
    }
  }
  
  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }
  
  if (cached) {
    memoryCache.delete(key);
  }
  
  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  const redis = getRedisClient();
  
  if (redis && redisAvailable) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
  
  memoryCache.set(key, {
    value,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedisClient();
  
  if (redis && redisAvailable) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }
  
  memoryCache.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  
  if (redis && redisAvailable) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis del pattern error:', error);
    }
  }
  
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
}

export async function getOrSetCache<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  ttlSeconds: number = 3600
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const freshData = await fetchFn();
  await cacheSet(key, freshData, ttlSeconds);
  return freshData;
}

export const CacheKeys = {
  propertyListings: () => 'property:listings',
  propertyById: (id: string) => `property:${id}`,
  memberProfile: (address: string) => `member:${address}`,
  governanceProposals: () => 'governance:proposals',
  proposalById: (id: string) => `governance:proposal:${id}`,
  treasuryStats: () => 'treasury:stats',
  trainingPrograms: () => 'training:programs',
  leaderboard: (type: string) => `leaderboard:${type}`,
  userAchievements: (address: string) => `achievements:${address}`,
  notificationCount: (address: string) => `notifications:count:${address}`
};

export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400
};
