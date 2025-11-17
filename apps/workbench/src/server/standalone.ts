#!/usr/bin/env node
/**
 * Standalone tRPC server with hybrid OpenAPI/REST support
 * Can be used as an orchestration layer for external applications (e.g., Python backends)
 *
 * Features:
 * - tRPC endpoints for TypeScript clients
 * - REST/OpenAPI endpoints for any HTTP client
 * - CORS support for cross-origin requests
 * - Comprehensive API documentation at /openapi.json
 */

import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './root';
import { prisma } from './db/client';
import * as corsLib from 'cors';
import type { IncomingMessage, ServerResponse } from 'http';
import { openApiSpec } from './openapi-spec';

const cors = corsLib.default;

// Simple logger for standalone server
const logger = {
  info: (msg: string, ...args: any[]) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg: string, err?: Error | unknown, meta?: any) => console.error(`[ERROR] ${msg}`, err, meta),
};

console.log('[INFO] Starting AI Workflow Engine Standalone Server...');

// Create context for standalone server (tRPC - needs req/res)
const createTrpcContext = async (opts: { req: IncomingMessage; res: ServerResponse }) => {
  const isDemoMode =
    process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!isDemoMode) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connected successfully');
    } catch (dbError) {
      logger.error('❌ Database connection failed', dbError as Error);
      throw new Error('Database connection required for non-demo mode');
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    db: isDemoMode ? null : prisma,
    user: {
      id: 'standalone-user',
      sessionId: 'standalone-session',
    },
    signal: new AbortController().signal,
  };
};

// Create context for OpenAPI (doesn't need req/res)
const createOpenApiContext = async () => {
  const isDemoMode =
    process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  return {
    db: isDemoMode ? null : prisma,
    user: {
      id: 'standalone-user',
      sessionId: 'standalone-session',
    },
    signal: new AbortController().signal,
  };
};

// CORS configuration
const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
  credentials: true,
});

// Use manual OpenAPI specification (avoids zod compatibility issues)
const getOpenApiDocument = () => {
  // Update server URL dynamically
  const spec = { ...openApiSpec };
  spec.servers = [{
    url: `http://localhost:${process.env.STANDALONE_PORT || 3001}`,
    description: 'Standalone server'
  }];
  return spec;
};

// Create HTTP server with both tRPC and REST endpoints
const server = createHTTPServer({
  router: appRouter,
  createContext: createTrpcContext,
  middleware: async (req: IncomingMessage, res: ServerResponse, next) => {
    // Apply CORS
    await new Promise<void>((resolve) => {
      corsMiddleware(req, res, () => resolve());
    });

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Serve OpenAPI document
    if (req.url === '/openapi.json') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(getOpenApiDocument(), null, 2));
      return;
    }

    // Serve Swagger UI redirect
    if (req.url === '/docs' || req.url === '/api-docs') {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>API Documentation</title>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
              SwaggerUIBundle({
                url: '/openapi.json',
                dom_id: '#swagger-ui',
              });
            </script>
          </body>
        </html>
      `);
      return;
    }

    // Health check endpoint
    if (req.url === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mode: process.env.DEMO_MODE === 'true' ? 'demo' : 'database'
      }));
      return;
    }

    next();
  },
  onError: ({ error, req, path }) => {
    logger.error('Standalone server error:', error, {
      path,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  },
});

// Start server
const PORT = parseInt(process.env.STANDALONE_PORT || '3001', 10);
const HOST = process.env.STANDALONE_HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║  🚀 AI Workflow Engine - Standalone Orchestration Server     ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     Running                                          ║
║  Mode:       ${process.env.DEMO_MODE === 'true' ? 'Demo (In-Memory)' : 'Database'}                                   ║
║  Host:       ${HOST}                                          ║
║  Port:       ${PORT}                                          ║
║                                                               ║
║  🔗 Endpoints:                                                ║
║     tRPC:        http://${HOST}:${PORT}/                      ║
║     Health:      http://${HOST}:${PORT}/health               ║
║     API Docs:    http://${HOST}:${PORT}/docs                 ║
║     OpenAPI:     http://${HOST}:${PORT}/openapi.json         ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  logger.info('Ready to accept requests from external applications');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});
