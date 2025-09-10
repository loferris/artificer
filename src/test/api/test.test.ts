import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import testHandler from '../../pages/api/test';

describe('/api/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles POST requests correctly', async () => {
    const requestBody = { test: 'data' };

    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/test',
      headers: {
        'content-type': 'application/json',
      },
      body: requestBody,
    });

    await testHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('application/json');

    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      message: 'API is working',
      method: 'POST',
      timestamp: expect.any(String),
      body: requestBody,
    });
  });

  it('rejects non-POST methods with 405', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      url: '/api/test',
      headers: {
        'content-type': 'application/json',
      },
    });

    await testHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getHeaders()['content-type']).toBe('application/json');

    const responseData = JSON.parse(res._getData());
    expect(responseData).toEqual({
      message: 'Method not allowed',
      allowedMethods: ['POST'],
      receivedMethod: 'GET',
    });
  });

  it('handles different HTTP methods correctly', async () => {
    const methods = ['PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

    for (const method of methods) {
      const { req, res } = createMocks({
        method,
        url: '/api/test',
        headers: {
          'content-type': 'application/json',
        },
      });

      await testHandler(req, res);

      expect(res._getStatusCode()).toBe(405);

      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Method not allowed');
      expect(responseData.allowedMethods).toEqual(['POST']);
      expect(responseData.receivedMethod).toBe(method);
    }
  });
});
