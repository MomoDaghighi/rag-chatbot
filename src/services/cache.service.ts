import IORedis from 'ioredis';
import config from '../config';
import { cosine } from '../utils/cosine';
import logger from '../utils/logger';

let redis: IORedis | null = null;
let ready = false;
const SIMILARITY_THRESHOLD = 0.85;
const CACHE_TTL = 86400;

function createRedis() {
  const url = config.redisUrl.replace('::1', '127.0.0.1').replace('localhost', '127.0.0.1');
  redis = new IORedis(url, {
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
  });

  redis.on('error', (err) => {
    ready = false;
    logger.warn('[Redis] error:', err.message);
  });

  redis.on('connect', () => {
    ready = true;
    logger.info('[Redis] connected');
  });

  redis.connect().catch(() => {
    logger.warn('[Redis] initial connect failed — cache disabled');
  });
}

createRedis();

export { redis, ready };

export async function setCache(
  embedding: number[],
  response: string,
  userId: string,
  sessionId: string
) {
  if (!redis || !ready) return;

  const key = `cache:${userId}:${sessionId}`;
  try {
    await redis.setex(key, CACHE_TTL, JSON.stringify({ embedding, response }));
    logger.debug('Response cached', { key });
  } catch (e: any) {
    logger.warn('[cache.set] error:', e.message);
  }
}

export async function findSimilarInCache(
  queryEmbedding: number[],
  userId: string,
  sessionId: string
): Promise<string | null> {
  if (!redis || !ready) return null;

  const key = `cache:${userId}:${sessionId}`;
  try {
    const cachedStr = await redis.get(key);
    if (!cachedStr) return null;

    const cached = JSON.parse(cachedStr);
    const similarity = cosine(queryEmbedding, cached.embedding);
    if (similarity >= SIMILARITY_THRESHOLD) {
      logger.info('[Cache] Hit by similarity', { similarity: similarity.toFixed(3), key });
      return cached.response;
    }
  } catch (e: any) {
    logger.warn('[cache.similar] error:', e.message);
  }
  return null;
}

export function closeRedis() {
  redis?.disconnect();
}