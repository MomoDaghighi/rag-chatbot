import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

export async function embedText(text: string): Promise<number[]> {
  
  if (config.embeddingProvider === 'mock') {
    logger.debug('Using smart mock embedding (384-dim)');

    const arr = new Array(384).fill(0.1);

    const keywords: Record<string, number> = {
      install: 0.95,
      installation: 0.94,
      setup: 0.90,
      steps: 0.88,
      guide: 0.85,
      download: 0.80,
      run: 0.75,
      error: 0.70,
      fix: 0.68,
      product: 0.65,
      app: 0.60,
      hooshpod: 0.98,
      faq: 0.75,
      support: 0.70,
    };

    const lower = text.toLowerCase();
    Object.entries(keywords).forEach(([word, score]) => {
      if (lower.includes(word)) {
        const idx = word.charCodeAt(0) % 384;
        arr[idx] = Math.max(arr[idx], score);
      }
    });

    const norm = Math.sqrt(arr.reduce((s, v) => s + v * v, 0)) || 1;
    return arr.map(v => v / norm);
  }

  
  if (config.embeddingProvider === 'cohere' && config.cohereKey) {
    try {
      const start = Date.now();
      const resp = await axios.post(
        'https://api.cohere.com/v1/embed',
        { 
          texts: [text], 
          model: 'embed-multilingual-v3.0',
          input_type: 'search_query' 
        },
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

  
  if (config.embeddingProvider === 'openai' && config.openaiKey) {
    try {
      const start = Date.now();
      const resp = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-3-small',
          input: text,
        },
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
      logger.error('OpenAI embedding failed', { error: err.message });
    }
  }

 
  logger.warn('All embedding providers failed, using mock fallback');
  const arr = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    arr[i % 1536] = (text.charCodeAt(i) % 100) / 100;
  }
  return arr;
}