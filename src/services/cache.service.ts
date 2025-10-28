import IORedis from 'ioredis';
import config from '../config';
import { cosine } from '../utils/cosine';

let redis: IORedis | null = null;
let ready = false;
const CACHE_PREFIX = 'cache:';

function createRedis() {
  const url = config.redisUrl.replace('::1', '127.0.0.1').replace('localhost', '127.0.0.1');
  redis = new IORedis(url, {
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
  });

  redis.on('error', (err) => {
    ready = false;
    console.warn('[Redis] error:', err.message);
  });

  redis.on('connect', () => {
    ready = true;
    console.log('[Redis] connected');
  });

  redis.connect().catch(() => {
    console.warn('[Redis] initial connect failed — cache disabled');
  });
}

createRedis();

export { redis, ready };

export async function setCache(key: string, value: any, ttl = 3600) {
  if (!redis || !ready) return;
  try {
    await redis.set(CACHE_PREFIX + key, JSON.stringify(value), 'EX', ttl);
  } catch (e) {
    console.warn('[cache.set] error:', e);
  }
}

export async function findSimilarInCache(
  queryEmbedding: number[],
  threshold = 0.90
): Promise<{ response: string; cached: true } | null> {
  if (!redis || !ready) return null;

  try {
    const keys = await redis.keys(CACHE_PREFIX + 'msg:*');
    if (!keys.length) return null;

    
    const recentKeys = keys.slice(-50);

    for (const key of recentKeys) {
      const cachedStr = await redis.get(key);
      if (!cachedStr) continue;

      const cached = JSON.parse(cachedStr);
      if (!cached.embedding || !Array.isArray(cached.embedding)) continue;

      const similarity = cosine(queryEmbedding, cached.embedding);
      if (similarity >= threshold) {
        console.log(`[Cache] Hit by similarity: ${similarity.toFixed(3)}`);
        return { response: cached.response, cached: true };
      }
    }
  } catch (e) {
    console.warn('[cache.similar] search failed:', e);
  }

  return null;
}

export function closeRedis() {
  redis?.disconnect();
}