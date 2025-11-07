// Debug endpoint to check demo mode status
import { NextApiRequest, NextApiResponse } from 'next';
import { isDemoMode, isServerSideDemo } from '../../utils/demo';
import { logger } from '../../server/utils/logger';

interface DemoStatusResponse {
  isDemoMode: boolean;
  isServerSideDemo: boolean;
  environment: {
    DEMO_MODE: string | undefined;
    NEXT_PUBLIC_DEMO_MODE: string | undefined;
    VERCEL_ENV: string | undefined;
    NODE_ENV: string | undefined;
  };
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DemoStatusResponse>,
) {
  try {
    const status: DemoStatusResponse = {
      isDemoMode: isDemoMode(),
      isServerSideDemo: isServerSideDemo(),
      environment: {
        DEMO_MODE: process.env.DEMO_MODE,
        NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
        VERCEL_ENV: process.env.VERCEL_ENV,
        NODE_ENV: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(status);
  } catch (error) {
    logger.error(
      'Error in demo-status endpoint:',
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      isDemoMode: false,
      isServerSideDemo: false,
      environment: {
        DEMO_MODE: undefined,
        NEXT_PUBLIC_DEMO_MODE: undefined,
        VERCEL_ENV: undefined,
        NODE_ENV: undefined,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
