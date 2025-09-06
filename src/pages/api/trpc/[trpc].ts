import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/root';
import { createContext } from '../../../server/trpc';

const handler = createNextApiHandler({
  router: appRouter,
  createContext,
  onError: ({ error, req, type, path, input }) => {
    console.error('tRPC API Error:', {
      type,
      path,
      input,
      url: req.url,
      method: req.method,
      headers: req.headers,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        cause: error.cause,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    });

    // In production, ensure we always return JSON
    if (process.env.NODE_ENV === 'production') {
      // Force JSON response even on server errors
      return;
    }
  },
  responseMeta: ({ ctx, type, errors }) => {
    // Ensure proper headers are set
    return {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': type === 'query' ? 's-maxage=1, stale-while-revalidate' : 'no-cache',
      },
    };
  },
});

export default handler;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: false,
  },
};
