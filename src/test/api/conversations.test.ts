import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import createConversation from '../../pages/api/conversations/create';
import listConversations from '../../pages/api/conversations/list';

describe('/api/conversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/conversations/create', () => {
    it('creates a demo conversation', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/conversations/create',
        headers: {
          'content-type': 'application/json',
        },
      });

      await createConversation(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()['content-type']).toBe('application/json');

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        id: expect.stringMatching(/^demo-\d+$/),
        title: null,
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify timestamps are valid ISO strings
      expect(new Date(responseData.createdAt)).toBeInstanceOf(Date);
      expect(new Date(responseData.updatedAt)).toBeInstanceOf(Date);
    });

    it('rejects non-POST methods with 405', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/conversations/create',
        headers: {
          'content-type': 'application/json',
        },
      });

      await createConversation(req, res);

      expect(res._getStatusCode()).toBe(405);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        message: 'Method not allowed',
        allowedMethods: ['POST'],
      });
    });
  });

  describe('GET /api/conversations/list', () => {
    it('returns demo conversations', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/conversations/list',
        headers: {
          'content-type': 'application/json',
        },
      });

      await listConversations(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()['content-type']).toBe('application/json');

      const responseData = JSON.parse(res._getData());
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(1);

      const conversation = responseData[0];
      expect(conversation).toEqual({
        id: 'demo-1',
        title: 'Welcome to the Chat App Demo!',
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            content:
              'Welcome to this AI chat application! This is a showcase demo featuring real-time AI conversations, conversation management, export functionality, and more!',
            tokens: 25,
            createdAt: expect.any(String),
            conversationId: 'demo-1',
            parentId: null,
          },
        ],
      });

      // Verify timestamps are valid ISO strings
      expect(new Date(conversation.createdAt)).toBeInstanceOf(Date);
      expect(new Date(conversation.updatedAt)).toBeInstanceOf(Date);
      expect(new Date(conversation.messages[0].createdAt)).toBeInstanceOf(Date);
    });

    it('rejects non-GET methods with 405', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/conversations/list',
        headers: {
          'content-type': 'application/json',
        },
      });

      await listConversations(req, res);

      expect(res._getStatusCode()).toBe(405);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual({
        message: 'Method not allowed',
        allowedMethods: ['GET'],
      });
    });
  });
});
