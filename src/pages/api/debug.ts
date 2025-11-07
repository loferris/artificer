import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../server/utils/logger';

interface DebugResponse {
  environment: string;
  vercel?: {
    url?: string;
    region?: string;
    deployment?: string;
  };
  database: {
    url?: string;
    provider?: string;
  };
  demo: {
    mode?: string;
    publicMode?: string;
  };
  headers: Record<string, string | string[] | undefined>;
  timestamp: string;
}

export default async function debug(req: NextApiRequest, res: NextApiResponse<DebugResponse>) {
  try {
    const response: DebugResponse = {
      environment: process.env.NODE_ENV || 'development',
      vercel: {
        url: process.env.VERCEL_URL,
        region: process.env.VERCEL_REGION,
        deployment: process.env.VERCEL_GIT_COMMIT_SHA,
      },
      database: {
        url: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        provider: process.env.DATABASE_URL?.includes('postgresql')
          ? 'postgresql'
          : process.env.DATABASE_URL?.includes('mysql')
            ? 'mysql'
            : process.env.DATABASE_URL?.includes('file:')
              ? 'sqlite'
              : 'unknown',
      },
      demo: {
        mode: process.env.DEMO_MODE,
        publicMode: process.env.NEXT_PUBLIC_DEMO_MODE,
      },
      headers: req.headers,
      timestamp: new Date().toISOString(),
    };

    // Only show debug info in development or with secret
    const debugSecret = req.query.secret || req.headers.authorization?.replace('Bearer ', '');
    if (process.env.NODE_ENV === 'production' && debugSecret !== process.env.DEBUG_SECRET) {
      return res.status(401).json({
        environment: 'production',
        vercel: {},
        database: { url: 'HIDDEN' },
        demo: {},
        headers: {},
        timestamp: new Date().toISOString(),
      });
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).json(response);
  } catch (error) {
    logger.error(
      'Debug endpoint failed:',
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      environment: 'error',
      vercel: {},
      database: {},
      demo: {},
      headers: {},
      timestamp: new Date().toISOString(),
    });
  }
}
