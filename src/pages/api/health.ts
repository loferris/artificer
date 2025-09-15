import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../server/db/client';
import { logger } from '../../server/utils/logger';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected' | 'error';
  version?: string;
  environment?: string;
  error?: string;
}

export default async function health(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>,
) {
  const startTime = Date.now();

  try {
    // Basic health check response
    const response: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      response.database = 'connected';
    } catch (dbError) {
      response.database = 'error';
      response.status = 'unhealthy';
      response.error = 'Database connection failed';
      logger.error(
        'Health check: Database connection failed',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
      );
    }

    // Log health check request
    const duration = Date.now() - startTime;
    logger.debug('Health check completed', {
      status: response.status,
      database: response.database,
      duration,
    });

    // Set appropriate HTTP status
    const httpStatus = response.status === 'healthy' ? 200 : 503;

    // Cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(httpStatus).json(response);
  } catch (error) {
    let uptime = 0;
    try {
      uptime = process.uptime();
    } catch (uptimeError) {
      // If we can't get uptime, use 0 as default
      logger.error('Failed to get process uptime:', uptimeError as Error);
    }

    const duration = Date.now() - startTime;
    logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)), {
      duration,
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      database: 'error',
      error: 'Health check failed',
    });
  }
}
