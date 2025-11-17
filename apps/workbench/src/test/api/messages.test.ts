import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import createMessage from '../../pages/api/messages/create';
import listMessages from '../../pages/api/messages/list';

describe('/api/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/messages/create', () => {
    it('creates a demo message', async () => {
      const requestBody = {
        conversationId: 'test-conversation',
        role: 'user',
        content: 'Hello, world!',
        tokens: 10,
      };

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/messages/create',
        headers: {
          'content-type': 'application/json',
        },
        body: requestBody,
      });

      await createMessage(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()['content-type']).toBe('application/json');

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        id: expect.stringMatching(/^msg-\d+$/),
        conversationId: 'test-conversation',
        role: 'user',
        content: 'Hello, world!',
        tokens: 10,
        createdAt: expect.any(String),
        parentId: null,
      });

      // Verify timestamp is valid ISO string
      expect(new Date(responseData.createdAt)).toBeInstanceOf(Date);
    });

    it('creates a demo message with default values', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/messages/create',
        headers: {
          'content-type': 'application/json',
        },
        body: {},
      });

      await createMessage(req, res);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        id: expect.stringMatching(/^msg-\d+$/),
        conversationId: 'demo-1',
        role: 'user',
        content: 'Hello!',
        tokens: 5,
        createdAt: expect.any(String),
        parentId: null,
      });
    });

    it('rejects non-POST methods with 405', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/messages/create',
        headers: {
          'content-type': 'application/json',
        },
      });

      await createMessage(req, res);

      expect(res._getStatusCode()).toBe(405);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        message: 'Method not allowed',
        allowedMethods: ['POST'],
      });
    });
  });

  describe('GET /api/messages/list', () => {
    it('returns demo messages', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/messages/list?conversationId=test-conversation',
        headers: {
          'content-type': 'application/json',
        },
        query: {
          conversationId: 'test-conversation',
        },
      });

      await listMessages(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()['content-type']).toBe('application/json');

      const responseData = JSON.parse(res._getData());
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(1);

      const message = responseData[0];
      expect(message).toEqual({
        id: 'demo-msg-1',
        role: 'assistant',
        content:
          'Welcome to this AI chat application! This is a showcase demo featuring real-time AI conversations, conversation management, export functionality, and more!',
        timestamp: expect.any(String),
        model: 'demo-assistant-v1',
        cost: 0.001,
      });

      // Verify timestamp is valid ISO string
      expect(new Date(message.timestamp)).toBeInstanceOf(Date);
    });

    it('rejects non-GET methods with 405', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/messages/list',
        headers: {
          'content-type': 'application/json',
        },
      });

      await listMessages(req, res);

      expect(res._getStatusCode()).toBe(405);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        message: 'Method not allowed',
        allowedMethods: ['GET'],
      });
    });
  });
});
