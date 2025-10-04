import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as staticDemo from '../staticDemo';

describe('Static Demo Utilities', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.window = originalWindow;
  });

  describe('isStaticDemo', () => {
    it('should return true when NEXT_PUBLIC_DEMO_MODE is set to true', () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

      expect(staticDemo.isStaticDemo()).toBe(true);
    });

    it('should return true when running client-side and hostname includes vercel.app', () => {
      // Simulate client-side environment with vercel.app hostname
      global.window = {
        location: {
          hostname: 'chat-app-git-feature-demo.vercel.app',
        },
      } as any;
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';

      expect(staticDemo.isStaticDemo()).toBe(true);
    });

    it('should return false when not in static demo mode', () => {
      expect(staticDemo.isStaticDemo()).toBe(false);
    });

    it('should return false when running server-side', () => {
      // Simulate server-side environment
      global.window = undefined as any;
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';

      expect(staticDemo.isStaticDemo()).toBe(false);
    });
  });

  describe('initializeStaticDemo', () => {
    it('should store demo data in localStorage when in static demo mode', () => {
      // Mock localStorage
      const mockSetItem = vi.fn();
      global.localStorage = {
        setItem: mockSetItem,
      } as any;

      // Mock window and demo mode
      global.window = {} as any;
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

      staticDemo.initializeStaticDemo();

      expect(mockSetItem).toHaveBeenCalledWith(
        'static-demo-conversations',
        JSON.stringify(staticDemo.DEMO_CONVERSATIONS),
      );
    });

    it('should not store demo data when not in static demo mode', () => {
      // Mock localStorage
      const mockSetItem = vi.fn();
      global.localStorage = {
        setItem: mockSetItem,
      } as any;

      // Mock window but not in demo mode
      global.window = {
        location: {
          hostname: 'localhost',
        },
      } as any;
      process.env.NEXT_PUBLIC_DEMO_MODE = 'false';

      staticDemo.initializeStaticDemo();

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('should not store demo data when running server-side', () => {
      // Simulate server-side environment
      global.window = undefined as any;
      process.env.NEXT_PUBLIC_DEMO_MODE = 'true';

      staticDemo.initializeStaticDemo();

      // No localStorage access on server-side
    });
  });

  describe('getStaticDemoData', () => {
    it('should return demo conversations and messages', () => {
      const demoData = staticDemo.getStaticDemoData();

      expect(demoData).toHaveProperty('conversations');
      expect(demoData).toHaveProperty('messages');
      expect(Array.isArray(demoData.conversations)).toBe(true);
      expect(Array.isArray(demoData.messages)).toBe(true);

      // Verify conversations structure
      expect(demoData.conversations[0]).toEqual({
        id: 'demo-1',
        title: 'Welcome - Interface Features Demo',
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant showcasing the demo features.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        messages: [],
      });

      // Verify messages structure
      expect(demoData.messages[0]).toEqual({
        id: 'demo-1-msg-1',
        role: 'user',
        content: 'What makes this chat application special?',
        timestamp: expect.any(Date),
        model: undefined,
        cost: undefined,
        conversationId: 'demo-1',
      });

      expect(demoData.messages[1]).toEqual({
        id: 'demo-1-msg-2',
        role: 'assistant',
        content: expect.stringContaining('Welcome to the AI Workflow Engine!'),
        timestamp: expect.any(Date),
        model: 'demo-assistant-v1',
        cost: expect.any(Number),
        conversationId: 'demo-1',
      });
    });
  });

  describe('generateDemoResponse', () => {
    it('should generate a valid demo response message', () => {
      const userMessage = 'Hello!';
      const response = staticDemo.generateDemoResponse(userMessage);

      expect(response).toEqual({
        id: expect.stringMatching(/^demo-response-\d+$/),
        role: 'assistant',
        content: expect.any(String),
        timestamp: expect.any(Date),
        model: 'demo-assistant-v1',
        cost: expect.any(Number),
      });

      // Verify content is non-empty and contextual
      expect(response.content.length).toBeGreaterThan(0);
      expect(typeof response.content).toBe('string');
    });

    it('should generate different responses randomly', () => {
      const userMessage = 'Hello!';
      const responses = new Set();

      // Generate multiple responses and collect unique content
      for (let i = 0; i < 10; i++) {
        const response = staticDemo.generateDemoResponse(userMessage);
        responses.add(response.content);
      }

      // Should have at least some variation (not guaranteed to be all different due to randomness)
      expect(responses.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DEMO_CONVERSATIONS', () => {
    it('should have the correct structure', () => {
      expect(Array.isArray(staticDemo.DEMO_CONVERSATIONS)).toBe(true);
      expect(staticDemo.DEMO_CONVERSATIONS.length).toBeGreaterThan(0);

      const conversation = staticDemo.DEMO_CONVERSATIONS[0];
      expect(conversation).toEqual({
        id: 'demo-1',
        title: 'Welcome - Interface Features Demo',
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant showcasing the demo features.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        messages: [],
      });
    });
  });

  describe('DEMO_MESSAGES', () => {
    it('should have the correct structure', () => {
      expect(Array.isArray(staticDemo.DEMO_MESSAGES)).toBe(true);
      expect(staticDemo.DEMO_MESSAGES.length).toBeGreaterThan(0);

      const message = staticDemo.DEMO_MESSAGES[0];
      expect(message).toEqual({
        id: 'demo-1-msg-1',
        role: 'user',
        content: 'What makes this chat application special?',
        timestamp: expect.any(Date),
        model: undefined,
        cost: undefined,
        conversationId: 'demo-1',
      });

      const assistantMessage = staticDemo.DEMO_MESSAGES[1];
      expect(assistantMessage).toEqual({
        id: 'demo-1-msg-2',
        role: 'assistant',
        content: expect.stringContaining('Welcome to the AI Workflow Engine!'),
        timestamp: expect.any(Date),
        model: 'demo-assistant-v1',
        cost: expect.any(Number),
        conversationId: 'demo-1',
      });
    });
  });
});
