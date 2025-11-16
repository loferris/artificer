// src/pages/api/stream/orchestration.ts - SSE endpoint for streaming chain orchestration
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createServicesFromContext } from '../../../server/services/ServiceFactory';
import { getUserFromRequest } from '../../../server/utils/session';
import { createRateLimitMiddleware } from '../../../server/middleware/rateLimiter';
import { logger } from '../../../server/utils/logger';
import { prisma } from '../../../server/db/client';
import { ChainOrchestrator } from '../../../server/services/orchestration/ChainOrchestrator';
import { ChainConfig } from '../../../server/services/orchestration/types';
import { getModelRegistry } from '../../../server/services/orchestration/ModelRegistry';

// Input validation schema
const streamOrchestrationSchema = z.object({
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

// Build chain config from environment
function buildChainConfig(): ChainConfig {
  const analyzerModel = process.env.ANALYZER_MODEL || 'deepseek/deepseek-chat';
  const routerModel = process.env.ROUTER_MODEL || 'anthropic/claude-3-haiku';
  const validatorModel = process.env.VALIDATOR_MODEL || 'anthropic/claude-3-5-sonnet';

  const modelsList = process.env.OPENROUTER_MODELS ||
    'deepseek/deepseek-chat,anthropic/claude-3-haiku,anthropic/claude-3-5-sonnet,openai/gpt-4o-mini';

  const availableModels = modelsList
    .split(',')
    .map(m => m.trim())
    .filter(m => m.length > 0);

  const minComplexity = parseInt(process.env.CHAIN_ROUTING_MIN_COMPLEXITY || '5', 10);
  const maxRetries = parseInt(process.env.MAX_RETRIES || '2', 10);
  const validationEnabled = process.env.VALIDATION_ENABLED !== 'false';
  const preferCheapModels = process.env.PREFER_CHEAP_MODELS === 'true';

  return {
    analyzerModel,
    routerModel,
    validatorModel,
    availableModels,
    minComplexityForChain: minComplexity,
    maxRetries,
    validationEnabled,
    preferCheapModels,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if chain routing is enabled
    const chainEnabled = process.env.CHAIN_ROUTING_ENABLED !== 'false';
    if (!chainEnabled) {
      return res.status(400).json({
        error: 'Chain routing is not enabled. Use regular /api/stream/chat instead.',
      });
    }

    // Apply rate limiting
    const user = getUserFromRequest(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = user?.sessionId || 'anonymous';
    const identifier = `${userAgent}-${sessionId}`;

    const rateLimit = createRateLimitMiddleware('ORCHESTRATION');
    const rateLimitResult = rateLimit(identifier);

    if (!rateLimitResult.allowed) {
      logger.rateLimitHit(identifier, '/api/stream/orchestration', rateLimitResult.resetTime);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      });
    }

    // Validate input
    const parseResult = streamOrchestrationSchema.safeParse(req.body);
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
    writeSSEComment(res, 'Chain orchestration stream connected');
    writeSSEData(res, { type: 'connected', timestamp: new Date().toISOString() }, 'connection');

    // Create abort controller for cleanup
    const controller = new AbortController();

    // Handle client disconnect
    req.on('close', () => {
      if (!req.complete) {
        logger.info('Orchestration SSE client disconnected early', { conversationId, userId: sessionId });
        controller.abort();
      }
    });

    req.on('aborted', () => {
      logger.info('Orchestration SSE client aborted', { conversationId, userId: sessionId });
      controller.abort();
    });

    try {
      // Create mock context for service factory
      const isDemoMode =
        process.env.DEMO_MODE === 'true' ||
        process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
        !prisma;

      const mockCtx = {
        db: isDemoMode ? null : prisma,
        req,
        res,
        user: user || { id: 'demo-user', sessionId: 'demo-session' },
      };

      // Create services
      const { conversationService, messageService, assistant, structuredQueryService } = createServicesFromContext(mockCtx);

      // Validate conversation access
      await conversationService.validateConversationAccess(conversationId, sessionId);

      // Get conversation history
      const messages = await messageService.getMessages(conversationId, sessionId);
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Build chain config
      const config = buildChainConfig();

      // Get global model registry
      const registry = await getModelRegistry();

      // Create chain orchestrator with both ModelRegistry and StructuredQueryService
      const orchestrator = new ChainOrchestrator(config, assistant, mockCtx.db, registry, structuredQueryService);

      // Stream the orchestration progress
      const stream = orchestrator.orchestrateStream({
        userMessage: content,
        conversationHistory,
        conversationId,
        sessionId,
        config,
        signal: controller.signal,
      });

      // Send progress events as they arrive
      for await (const event of stream) {
        // Check if client disconnected
        if (controller.signal.aborted) {
          logger.info('Orchestration aborted by client', { conversationId });
          break;
        }

        // Send progress event
        writeSSEData(res, {
          type: event.type,
          stage: event.stage,
          message: event.message,
          progress: event.progress,
          metadata: event.metadata,
          timestamp: new Date().toISOString(),
        }, 'progress');

        // If complete, send the final result
        if (event.type === 'complete') {
          // The stream generator returned the full result
          // We already sent it in the progress event
          break;
        }
      }

      // Send completion event
      writeSSEData(res, {
        type: 'completed',
        timestamp: new Date().toISOString(),
      }, 'complete');

      logger.info('Orchestration stream completed', {
        conversationId,
        userId: sessionId,
      });

    } catch (streamError) {
      logger.error('Orchestration streaming error:', streamError);

      writeSSEData(res, {
        type: 'error',
        error: streamError instanceof Error ? streamError.message : 'Orchestration failed',
        timestamp: new Date().toISOString(),
      }, 'error');
    }

    // End the response
    res.end();

  } catch (error) {
    logger.error('Orchestration endpoint error:', error);

    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Otherwise send SSE error event and close
    writeSSEData(res, {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, 'error');

    res.end();
  }
}
