import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/root';
import { createContext } from '../../../server/trpc';

const handler = createNextApiHandler({
  router: appRouter,
  createContext,
  onError: ({ error, req }) => {
    console.error('tRPC API Error:', {
      path: req.url,
      method: req.method,
      error: {
        message: error.message,
        code: error.code,
        cause: error.cause,
      },
    });
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
