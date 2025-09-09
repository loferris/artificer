import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import debug from '../../pages/api/debug';

describe('/api/debug', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns debug information in development environment', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = undefined; // Clear database URL for test
    process.env.DEBUG_SECRET = undefined; // Clear debug secret for test
    
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/debug',
      headers: {
        'content-type': 'application/json',
      },
    });

    await debug(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('application/json');
    expect(res._getHeaders()['cache-control']).toBe('no-cache, no-store, must-revalidate');

    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      environment: 'development',
      vercel: {
        url: undefined,
        region: undefined,
        deployment: undefined,
      },
      database: {
        url: 'NOT_SET',
        provider: 'unknown',
      },
      demo: {
        mode: undefined,
        publicMode: undefined,
      },
      headers: {
        'content-type': 'application/json',
      },
      timestamp: expect.any(String),
    });
  });

  it('returns limited information in production without secret when DEBUG_SECRET is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEBUG_SECRET = 'real-secret'; // Set a real secret
    process.env.DATABASE_URL = undefined; // Clear database URL for test
    
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/debug',
      headers: {
        'content-type': 'application/json',
      },
    });

    await debug(req, res);

    expect(res._getStatusCode()).toBe(401); // Now it should return 401
    
    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      environment: 'production',
      vercel: {},
      database: { url: 'HIDDEN' },
      demo: {},
      headers: {},
      timestamp: expect.any(String),
    });
  });

  it('returns full information in production with correct secret', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEBUG_SECRET = 'test-secret';
    process.env.DATABASE_URL = undefined; // Clear database URL for test
    
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/debug?secret=test-secret',
      headers: {
        'content-type': 'application/json',
      },
    });

    await debug(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData.environment).toBe('production');
    expect(responseData.headers).toEqual({
      'content-type': 'application/json',
    });
  });

  it('returns full information in production with authorization header', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEBUG_SECRET = 'test-secret';
    process.env.DATABASE_URL = undefined; // Clear database URL for test
    
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/debug',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-secret',
      },
    });

    await debug(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData.environment).toBe('production');
    expect(responseData.headers).toEqual({
      'content-type': 'application/json',
      'authorization': 'Bearer test-secret',
    });
  });

  it('handles database URL parsing correctly', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.DEBUG_SECRET = undefined; // Clear debug secret for test
    
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/debug',
      headers: {
        'content-type': 'application/json',
      },
    });

    await debug(req, res);

    const responseData = JSON.parse(res._getData());
    expect(responseData.database.url).toBe('SET');
    expect(responseData.database.provider).toBe('postgresql');
  });
});