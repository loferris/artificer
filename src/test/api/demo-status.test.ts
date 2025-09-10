import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import demoStatus from '../../pages/api/demo-status';

// Mock the demo utility functions
vi.mock('../../utils/demo', () => ({
  isDemoMode: vi.fn(() => false),
  isServerSideDemo: vi.fn(() => false),
}));

describe('/api/demo-status', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns demo status information', async () => {
    const { isDemoMode, isServerSideDemo } = await import('../../utils/demo');
    (isDemoMode as vi.Mock).mockReturnValue(true);
    (isServerSideDemo as vi.Mock).mockReturnValue(false);

    // Clear environment variables for clean test
    process.env.DEMO_MODE = undefined;
    process.env.NEXT_PUBLIC_DEMO_MODE = undefined;
    process.env.VERCEL_ENV = undefined;
    process.env.NODE_ENV = undefined;

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/demo-status',
      headers: {
        'content-type': 'application/json',
      },
    });

    await demoStatus(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('application/json');

    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      isDemoMode: true,
      isServerSideDemo: false,
      environment: {
        DEMO_MODE: undefined,
        NEXT_PUBLIC_DEMO_MODE: undefined,
        VERCEL_ENV: undefined,
        NODE_ENV: undefined,
      },
      timestamp: expect.any(String),
    });
  });

  it('returns environment variables correctly', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    process.env.VERCEL_ENV = 'production';
    process.env.NODE_ENV = 'production';

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/demo-status',
      headers: {
        'content-type': 'application/json',
      },
    });

    await demoStatus(req, res);

    const responseData = JSON.parse(res._getData());
    expect(responseData.environment).toEqual({
      DEMO_MODE: 'true',
      NEXT_PUBLIC_DEMO_MODE: 'true',
      VERCEL_ENV: 'production',
      NODE_ENV: 'production',
    });
  });

  it('handles error gracefully', async () => {
    const { logger } = await import('../../server/utils/logger');
    const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const { isDemoMode } = await import('../../utils/demo');
    (isDemoMode as vi.Mock).mockImplementation(() => {
      throw new Error('Demo check failed');
    });

    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/demo-status',
      headers: {
        'content-type': 'application/json',
      },
    });

    await demoStatus(req, res);

    expect(res._getStatusCode()).toBe(500);

    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      isDemoMode: false,
      isServerSideDemo: false,
      environment: {
        DEMO_MODE: undefined,
        NEXT_PUBLIC_DEMO_MODE: undefined,
        VERCEL_ENV: undefined,
        NODE_ENV: undefined,
      },
      timestamp: expect.any(String),
    });

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error in demo-status endpoint:',
      expect.any(Error),
    );

    loggerErrorSpy.mockRestore();
  });
});
