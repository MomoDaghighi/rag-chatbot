import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

export async function embedText(text: string): Promise<number[]> {
  logger.info(`Generating embedding for: "${text.substring(0, 60)}..."`);

  
  if (config.embeddingProvider === 'mock') {
    logger.debug('Using mock embedding');
    const arr = new Array(1536).fill(0);
    for (let i = 0; i < text.length; i++) {
      arr[i % 1536] = (text.charCodeAt(i) % 100) / 100;
    }
    const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
    return arr.map(v => v / norm);
  }

  // OpenAI
  if (config.embeddingProvider === 'openai' && config.openaiKey) {
    try {
      const start = Date.now();
      const resp = await axios.post(
        'https://api.openai.com/v1/embeddings',
        { input: text, model: 'text-embedding-3-small' },
        {
          headers: {
            Authorization: `Bearer ${config.openaiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      const duration = Date.now() - start;
      logger.info('OpenAI embedding generated', { duration });
      return resp.data.data[0].embedding;
    } catch (err: any) {
      logger.error('OpenAI embedding failed', { error: err.response?.data || err.message });
    }
  }

  // Cohere
  if (config.embeddingProvider === 'cohere' && config.cohereKey) {
    try {
      const start = Date.now();
      const resp = await axios.post(
        'https://api.cohere.com/v1/embed',
        { texts: [text], model: 'embed-multilingual-v3.0', input_type: 'search_query' },
        {
          headers: {
            Authorization: `Bearer ${config.cohereKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      const duration = Date.now() - start;
      logger.info('Cohere embedding generated', { duration });
      return resp.data.embeddings[0];
    } catch (err: any) {
      logger.error('Cohere embedding failed', { error: err.message });
    }
  }

  // Final fallback
  logger.warn('All embedding providers failed, using mock fallback');
  const arr = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    arr[i % 1536] = (text.charCodeAt(i) % 100) / 100;
  }
  const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
  return arr.map(v => v / norm);
}