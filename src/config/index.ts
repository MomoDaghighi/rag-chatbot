import dotenv from 'dotenv';
dotenv.config();

const normalizeRedisUrl = (u?: string) => {
  if (!u) return 'redis://127.0.0.1:6379';
  return u.replace('::1', '127.0.0.1').replace('localhost', '127.0.0.1');
};

export default {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rag-chat',
  redisUrl: normalizeRedisUrl(process.env.REDIS_URL),
  openrouterKey: process.env.OPENROUTER_API_KEY || '',
  cohereKey: process.env.COHERE_API_KEY || '',
  openaiKey: process.env.OPENAI_API_KEY || '',
  
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
};