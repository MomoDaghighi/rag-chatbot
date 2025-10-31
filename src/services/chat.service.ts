import { embedText } from './embedding.service';
import { retrieveTopK } from './similarity.service';
import { knowledgeIndex } from './knowledge.service';

import { ChatModel } from '../models/chat.model';
import { callLLM } from './llm.service';
import logger from '../utils/logger';
import { setCache, findSimilarInCache } from './cache.service';

interface ChatResult {
  response: string;
  cached: boolean;
  timestamp: string;
  duration: number;
}

export async function processChat(
  message: string,
  userId: string,
  sessionId: string
): Promise<ChatResult> {
  const startTime = Date.now();
  logger.info('Processing chat request', { userId, sessionId, message: message.substring(0, 60) + '...' });

  try {
    
    const queryEmbedding = await embedText(message);
    logger.debug('Query embedding generated', { userId, sessionId });

    
    const cachedResult = await findSimilarInCache(queryEmbedding, userId, sessionId);
    if (cachedResult) {
      logger.info('Cache HIT', { userId, sessionId, cached: true });
      await saveChat(userId, sessionId, message, cachedResult, true);
      const duration = Date.now() - startTime;
      return {
        response: cachedResult,
        cached: true,
        timestamp: new Date().toISOString(),
        duration,
      };
    }

    logger.info('Cache MISS', { userId, sessionId });

  
    const topChunks = retrieveTopK(queryEmbedding, 3);
    const context = topChunks.map(c => c.text).join('\n\n');
    logger.debug('Retrieved top chunks', { userId, sessionId, chunkCount: topChunks.length });

    
    const history = await ChatModel.find({ userId, sessionId })
      .sort({ timestamp: -1 })
      .limit(8)
      .select('message response')
      .lean();

    const historyText = history
      .reverse()
      .map(h => `User: ${h.message}\nAssistant: ${h.response}`)
      .join('\n');

    logger.debug('History loaded', { userId, sessionId, historyLength: history.length });

    
    const prompt = `You are a helpful assistant. Use ONLY the knowledge below to answer the user's question. If the answer is not in the knowledge, say "I don't know".

Knowledge:
${context}

Conversation History:
${historyText}

User Question: ${message}

Answer:`;

    
    const llmResponse = await callLLM(prompt);
    const response = llmResponse?.trim() || "I don't know.";

    
    await saveChat(userId, sessionId, message, response, false);

    
    await setCache(queryEmbedding, response, userId, sessionId);

    const duration = Date.now() - startTime;
    logger.info('Chat processed successfully', {
      userId,
      sessionId,
      cached: false,
      duration,
      responseLength: response.length,
    });

    return {
      response,
      cached: false,
      timestamp: new Date().toISOString(),
      duration,
    };
  } catch (error: any) {
    logger.error('Error in processChat', {
      userId,
      sessionId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}


async function saveChat(
  userId: string,
  sessionId: string,
  message: string,
  response: string,
  cached: boolean = false
) {
  try {
    await ChatModel.create({
      userId,
      sessionId,
      message,
      response,
      cached,
      timestamp: new Date(),
    });
    logger.debug('Chat saved to DB', { userId, sessionId, cached });
  } catch (err: any) {
    logger.error('Failed to save chat to DB', { error: err.message });
  }
}