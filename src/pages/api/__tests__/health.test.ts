import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import health from '../health';

// Mock the database client
vi.mock('../../../server/db/client', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

// Mock the logger
vi.mock('../../../server/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.uptime
    vi.spyOn(process, 'uptime').mockReturnValue(123.45);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns healthy status when database is connected', async () => {
      const { prisma } = await import('../../../server/db/client');
      (prisma.$queryRaw as vi.Mock).mockResolvedValue([{ '1': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: 123.45,
        database: 'connected',
        version: expect.any(String),
        environment: expect.any(String),
      });

      expect(prisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));
      const { logger } = await import('../../../server/utils/logger');
      expect(logger.debug).toHaveBeenCalledWith(
        'Health check completed',
        expect.objectContaining({
          status: 'healthy',
          database: 'connected',
          duration: expect.any(Number),
        })
      );
    });

    it('returns unhealthy status when database connection fails', async () => {
      const { prisma } = await import('../../../server/db/client');
      const dbError = new Error('Database connection failed');
      (prisma.$queryRaw as vi.Mock).mockRejectedValue(dbError);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getStatusCode()).toBe(503);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        uptime: 123.45,
        database: 'error',
        error: 'Database connection failed',
        version: expect.any(String),
        environment: expect.any(String),
      });

      const { logger } = await import('../../../server/utils/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Health check: Database connection failed',
        dbError
      );
    });

    it('returns unhealthy status when health check throws an error', async () => {
      // Mock process.uptime to throw an error
      const uptimeSpy = vi.spyOn(process, 'uptime').mockImplementation(() => {
        throw new Error('Process error');
      });

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getStatusCode()).toBe(503);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number), // This will be whatever the default value is
        database: 'error',
        error: 'Health check failed',
      });

      const { logger } = await import('../../../server/utils/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error),
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
      
      // Restore the spy
      uptimeSpy.mockRestore();
    });

    it('sets correct cache control headers', async () => {
      const { prisma } = await import('../../../server/db/client');
      (prisma.$queryRaw as vi.Mock).mockResolvedValue([{ '1': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getHeaders()).toMatchObject({
        'cache-control': 'no-cache, no-store, must-revalidate',
        'pragma': 'no-cache',
        'expires': '0',
      });
    });

    it('includes version and environment information', async () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        npm_package_version: '2.0.0',
        NODE_ENV: 'test',
      };

      const { prisma } = await import('../../../server/db/client');
      (prisma.$queryRaw as vi.Mock).mockResolvedValue([{ '1': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      const responseData = JSON.parse(res._getData());
      expect(responseData.version).toBe('2.0.0');
      expect(responseData.environment).toBe('test');

      // Restore environment
      process.env = originalEnv;
    });

    it('uses default values when environment variables are not set', async () => {
      // Mock environment variables to be undefined
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        npm_package_version: undefined,
        NODE_ENV: undefined,
      };

      const { prisma } = await import('../../../server/db/client');
      (prisma.$queryRaw as vi.Mock).mockResolvedValue([{ '1': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      const responseData = JSON.parse(res._getData());
      expect(responseData.version).toBe('1.0.0');
      expect(responseData.environment).toBe('development');

      // Restore environment
      process.env = originalEnv;
    });

    it('handles database error that is not an Error instance', async () => {
      const { prisma } = await import('../../../server/db/client');
      const dbError = 'String error';
      (prisma.$queryRaw as vi.Mock).mockRejectedValue(dbError);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getStatusCode()).toBe(503);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.database).toBe('error');
      expect(responseData.error).toBe('Database connection failed');

      const { logger } = await import('../../../server/utils/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Health check: Database connection failed',
        expect.any(Error)
      );
    });

    it('logs health check completion with correct duration', async () => {
      const { prisma } = await import('../../../server/db/client');
      (prisma.$queryRaw as vi.Mock).mockResolvedValue([{ '1': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      const startTime = Date.now();
      await health(req, res);
      const endTime = Date.now();

      const { logger } = await import('../../../server/utils/logger');
      expect(logger.debug).toHaveBeenCalledWith(
        'Health check completed',
        expect.objectContaining({
          status: 'healthy',
          database: 'connected',
          duration: expect.any(Number),
        })
      );

      // Verify duration is reasonable (should be very small for mocked call)
      const loggedDuration = (logger.debug as vi.Mock).mock.calls[0][1].duration;
      expect(loggedDuration).toBeGreaterThanOrEqual(0);
      expect(loggedDuration).toBeLessThan(endTime - startTime + 100); // Allow some margin
    });
  });

  describe('Error Handling', () => {
    it('handles unexpected errors gracefully', async () => {
      // Mock a function that will throw during execution
      const uptimeSpy = vi.spyOn(process, 'uptime').mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getStatusCode()).toBe(503);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.error).toBe('Health check failed');

      const { logger } = await import('../../../server/utils/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error),
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );

      // Restore the spy
      uptimeSpy.mockRestore();
    });

    it('handles non-Error objects in catch block', async () => {
      // Mock a function that will throw a non-Error object
      const uptimeSpy = vi.spyOn(process, 'uptime').mockImplementation(() => {
        throw 'String error';
      });

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getStatusCode()).toBe(503);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.status).toBe('unhealthy');
      expect(responseData.error).toBe('Health check failed');

      const { logger } = await import('../../../server/utils/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error),
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );

      // Restore the spy
      uptimeSpy.mockRestore();
    });
  });

  describe('Response Format', () => {
    it('returns valid JSON response', async () => {
      const { prisma } = await import('../../../server/db/client');
      (prisma.$queryRaw as vi.Mock).mockResolvedValue([{ '1': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      expect(res._getHeaders()['content-type']).toBe('application/json');
      
      const responseData = JSON.parse(res._getData());
      expect(typeof responseData.status).toBe('string');
      expect(typeof responseData.timestamp).toBe('string');
      expect(typeof responseData.uptime).toBe('number');
      expect(typeof responseData.database).toBe('string');
    });

    it('includes timestamp in ISO format', async () => {
      const { prisma } = await import('../../../server/db/client');
      (prisma.$queryRaw as vi.Mock).mockResolvedValue([{ '1': 1 }]);

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/health',
      });

      await health(req, res);

      const responseData = JSON.parse(res._getData());
      const timestamp = new Date(responseData.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });
});
