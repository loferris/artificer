// server.ts - Custom Next.js server with WebSocket support
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { appRouter } from './src/server/root';
import { createContext } from './src/server/trpc';
import { logger } from './src/server/utils/logger';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    if (!req.url) return;

    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  // Create WebSocket server
  const wss = new WebSocketServer({
    server,
    path: '/api/trpc-ws',
  });

  // Apply tRPC WebSocket handler
  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext: async ({ req }) => {
      // Create a mock Next.js context for WebSocket connections
      // Note: WebSocket connections don't have the same req/res objects as HTTP
      const mockReq = {
        ...req,
        headers: req.headers || {},
        method: 'GET',
        url: '/api/trpc-ws',
        on: () => {},
        complete: true,
      } as any;

      const mockRes = {
        setHeader: () => {},
        getHeader: () => undefined,
        removeHeader: () => {},
        writeHead: () => {},
        end: () => {},
      } as any;

      return createContext({
        req: mockReq,
        res: mockRes,
        info: {
          accept: 'application/jsonl' as const,
          type: 'query' as const,
          connectionParams: {},
          signal: new AbortController().signal,
          url: new URL('ws://localhost:3000/api/trpc-ws'),
          isBatchCall: false,
          calls: [],
        },
      });
    },
    onError: ({ error, path, type, input }) => {
      logger.error('WebSocket tRPC Error:', error, {
        path,
        type,
        input,
        timestamp: new Date().toISOString(),
      });
    },
  });

  // Start server
  server.listen(port, () => {
    logger.info(`Server running on http://${hostname}:${port}`);
    logger.info(`WebSocket server available at ws://${hostname}:${port}/api/trpc-ws`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    handler.broadcastReconnectNotification();
    wss.close();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    handler.broadcastReconnectNotification();
    wss.close();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
});
