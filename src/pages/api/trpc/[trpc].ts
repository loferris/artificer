import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/root';
import { createContext } from '../../../server/trpc';

export default createNextApiHandler({
  router: appRouter,
  createContext,
  onError: ({ error, req }) => {
    console.error('tRPC API Error:', {
      path: req.url,
      error: {
        message: error.message,
        code: error.code,
        cause: error.cause,
        stack: error.stack,
      },
    });

    // Log additional context for debugging
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      console.error('Internal server error details:', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        timestamp: new Date().toISOString(),
      });
    }
  },
  batching: {
    enabled: true,
  },
  responseMeta: ({ ctx, paths, type, errors }) => {
    // Handle errors in batch requests
    if (errors.length > 0) {
      const hasError = errors.some((error) => error.code === 'INTERNAL_SERVER_ERROR');
      if (hasError) {
        return {
          status: 500,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        };
      }
    }

    // Cache successful responses
    if (type === 'query' && errors.length === 0) {
      return {
        headers: {
          'Cache-Control': 's-maxage=10, stale-while-revalidate=59',
        },
      };
    }

    return {};
  },
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
