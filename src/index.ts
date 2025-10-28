import express from 'express';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import { createSwaggerDocs } from './swagger';
import { initKnowledge } from './services/knowledge.service';
import { processChat } from './services/chat.service';
import { ChatModel } from './models/chat.model';
import logger from './utils/logger';
import config from './config';
import { closeRedis } from './services/cache.service';

const app = express();
const PORT = config.port;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Rate Limiting (60 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/chat', limiter);

// Zod Schema for /chat
export const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  userId: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(100),
});

// Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(createSwaggerDocs()));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Send a message to the RAG chatbot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, userId, sessionId]
 *             properties:
 *               message:
 *                 type: string
 *                 example: How to install the product?
 *               userId:
 *                 type: string
 *                 example: u1
 *               sessionId:
 *                 type: string
 *                 example: s1
 *     responses:
 *       200:
 *         description: Chat response with caching info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 cached:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                 duration:
 *                   type: number
 *       400:
 *         description: Validation error
 */
app.post('/chat', async (req, res) => {
  try {
    const { message, userId, sessionId } = chatSchema.parse(req.body);
    const result = await processChat(message, userId, sessionId);
    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      logger.warn('Validation error', { errors: err.issues });
      return res.status(400).json({ error: 'Invalid input', details: err.issues });
    }
    logger.error('Chat endpoint error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});
/**
 * @swagger
 * /history/{userId}:
 *   get:
 *     summary: Get chat history for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated chat history
 */
app.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const [total, chats] = await Promise.all([
      ChatModel.countDocuments({ userId }),
      ChatModel.find({ userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .select('message response timestamp cached sessionId')
        .lean(),
    ]);

    res.json({
      data: chats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    logger.error('History endpoint error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  logger.info('Shutting down...');
  await mongoose.disconnect();
  closeRedis();
  process.exit(0);
}

// Startup
async function start() {
  try {
    
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected');

    
    const server = app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Swagger docs: http://localhost:${PORT}/docs`);
    });

    
    setImmediate(async () => {
      try {
        await initKnowledge();
        logger.info('Knowledge base loaded');
      } catch (err: any) {
        logger.error('Failed to load knowledge', { error: err.message });
      }
    });

    // Handle uncaught errors
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    });

    process.on('unhandledRejection', (err: any) => {
      logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
    });

  } catch (err: any) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

start();