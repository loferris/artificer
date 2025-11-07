// src/pages/api/stream/chat.ts - SSE endpoint for streaming chat responses
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createServicesFromContext } from '../../../server/services/ServiceFactory';
import { getUserFromRequest } from '../../../server/utils/session';
import { createRateLimitMiddleware, RATE_LIMITS } from '../../../server/middleware/rateLimiter';
import { logger } from '../../../server/utils/logger';
import { prisma } from '../../../server/db/client';

// Input validation schema
const streamChatSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content cannot be empty')
    .max(10000, 'Message content too long (max 10,000 characters)'),
  conversationId: z.string().min(1, 'Conversation ID is required'),
});

// SSE helper functions
const writeSSEData = (res: NextApiResponse, data: any, event?: string) => {
  if (event) {
    res.write(`event: ${event}\n`);
  }
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const writeSSEComment = (res: NextApiResponse, comment: string) => {
  res.write(`: ${comment}\n\n`);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply rate limiting
    const user = getUserFromRequest(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = user?.sessionId || 'anonymous';
    const identifier = `${userAgent}-${sessionId}`;

    const rateLimit = createRateLimitMiddleware('CHAT');
    const rateLimitResult = rateLimit(identifier);

    if (!rateLimitResult.allowed) {
      logger.rateLimitHit(identifier, '/api/stream/chat', rateLimitResult.resetTime);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      });
    }

    // Validate input
    const parseResult = streamChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: parseResult.error.issues,
      });
    }

    const { content, conversationId } = parseResult.data;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Add rate limit headers
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());

    // Send initial connection confirmation
    writeSSEComment(res, 'SSE stream connected');
    writeSSEData(res, { type: 'connected', timestamp: new Date().toISOString() }, 'connection');

    // Create abort controller for cleanup
    const controller = new AbortController();

    // Handle client disconnect
    req.on('close', () => {
      if (!req.complete) {
        logger.info('SSE client disconnected early', { conversationId, userId: sessionId });
        controller.abort();
      }
    });

    req.on('aborted', () => {
      logger.info('SSE client aborted', { conversationId, userId: sessionId });
      controller.abort();
    });

    try {
      // Create mock context for service factory
      const isDemoMode =
        process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

      const mockContext = {
        req,
        res,
        db: isDemoMode ? null : prisma,
        user,
        signal: controller.signal,
      };

      // Get services
      const { chatService } = createServicesFromContext(mockContext);

      // Create streaming input
      const streamInput = {
        content,
        conversationId,
        signal: controller.signal,
      };

      logger.info('Starting SSE chat stream', {
        conversationId,
        userId: sessionId,
        contentLength: content.length,
      });

      // Stream the response
      const stream = chatService.createMessageStream(streamInput, sessionId);

      for await (const chunk of stream) {
        // Check if client disconnected
        if (controller.signal.aborted) {
          logger.info('SSE stream aborted by signal', { conversationId, userId: sessionId });
          break;
        }

        // Send chunk as SSE event
        writeSSEData(res, chunk, 'chunk');

        // If this is the final chunk, break
        if (chunk.finished) {
          logger.info('SSE chat stream completed', {
            conversationId,
            userId: sessionId,
            error: chunk.error || null,
          });
          break;
        }
      }

      // Send completion event
      writeSSEData(res, { type: 'completed', timestamp: new Date().toISOString() }, 'complete');
    } catch (error) {
      logger.error('SSE chat stream error', error as Error, {
        conversationId,
        userId: sessionId,
      });

      // Send error event
      writeSSEData(
        res,
        {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
        },
        'error',
      );
    } finally {
      // Close the stream
      writeSSEComment(res, 'Stream ended');
      res.end();
    }
  } catch (error) {
    logger.error('SSE endpoint error', error as Error);

    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // If already streaming, send error event and close
    if (res.writable) {
      writeSSEData(
        res,
        {
          type: 'error',
          error: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
        'error',
      );
      res.end();
    }
  }
}

// Disable Next.js body parsing to handle streaming
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: false,
  },
};
