import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { DatabaseChatService, DemoChatService, ChatStreamChunk } from '../ChatService';
import { MockAssistant } from '../../assistant/assistant';
import type { ConversationService } from '../../conversation/ConversationService';
import type { MessageService } from '../../message/MessageService';

// Mock services
const mockConversationService = {
  validateAccess: vi.fn(),
  generateTitle: vi.fn(),
  updateTitle: vi.fn(),
  updateActivity: vi.fn(),
} as unknown as ConversationService;

const mockMessageService = {
  create: vi.fn(),
  getConversationHistory: vi.fn(),
  countByConversation: vi.fn(),
  estimateTokens: vi.fn(),
} as unknown as MessageService;

describe('ChatService Streaming', () => {
  let mockAssistant: MockAssistant;
  let chatService: DatabaseChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Make mock assistant deterministic for predictable test outcomes
    vi.spyOn(Math, 'random').mockReturnValue(0);

    mockAssistant = new MockAssistant();
    chatService = new DatabaseChatService(
      mockConversationService,
      mockMessageService,
      mockAssistant,
    );

    // Setup common mocks
    (mockConversationService.validateAccess as Mock).mockResolvedValue({
      id: 'conv-1',
      title: 'Test Conversation',
    });

    (mockMessageService.getConversationHistory as Mock).mockResolvedValue([]);
    (mockMessageService.countByConversation as Mock).mockResolvedValue(2);
    (mockMessageService.estimateTokens as Mock).mockReturnValue(10);

    (mockMessageService.create as Mock)
      .mockResolvedValueOnce({ id: 'msg-1', role: 'user', content: 'Hello' })
      .mockResolvedValueOnce({
        id: 'msg-2',
        role: 'assistant',
        content: 'Hello! How can I help?',
        tokens: 10,
        cost: 0.001,
      });
  });

  describe('createMessageStream', () => {
    it('should stream chunks from assistant', async () => {
      const chunks: ChatStreamChunk[] = [];

      const stream = chatService.createMessageStream({
        content: 'Hello',
        conversationId: 'conv-1',
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        chunks.push(chunk);
        fullResponse += chunk.content;
        if (chunk.finished) break;
      }

      // Should have received multiple chunks plus final completion
      expect(chunks.length).toBeGreaterThan(1);

      // All but last should be streaming chunks
      const streamingChunks = chunks.slice(0, -1);
      streamingChunks.forEach((chunk) => {
        expect(chunk.finished).toBe(false);
        expect(typeof chunk.content).toBe('string');
        expect(chunk.metadata?.model).toBe('mock-assistant');
      });

      // Last chunk should be completion
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.finished).toBe(true);
      expect(finalChunk.content).toBe('');
      expect(finalChunk.metadata?.messageId).toBeTruthy();

      // Verify full content
      expect(fullResponse).toBe('Mock streaming response to: "Hello"');
    });

    it('should create user and assistant messages', async () => {
      const stream = chatService.createMessageStream({
        content: 'Hello',
        conversationId: 'conv-1',
      });

      // Consume the stream
      for await (const chunk of stream) {
        if (chunk.finished) break;
      }

      // Should have created user message first
      expect(mockMessageService.create).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hello',
      });

      // Should have created assistant message with aggregated content
      expect(mockMessageService.create).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Mock streaming response to: "Hello"',
      });
    });

    it('should handle conversation validation errors', async () => {
      const validationError = new Error('Conversation not found');
      (mockConversationService.validateAccess as Mock).mockRejectedValue(validationError);

      const loggerModule = await import('../../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      const stream = chatService.createMessageStream({
        content: 'Hello',
        conversationId: 'invalid-conv',
      });

      const chunks: ChatStreamChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].finished).toBe(true);
      expect(chunks[0].error).toContain('Conversation not found');

      expect(loggerErrorSpy).toHaveBeenCalledWith('Chat stream error', validationError, {
        conversationId: 'invalid-conv',
        userId: undefined,
      });

      loggerErrorSpy.mockRestore();
    });

    it('should handle message validation errors', async () => {
      const loggerModule = await import('../../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      const stream = chatService.createMessageStream({
        content: '', // Invalid empty content
        conversationId: 'conv-1',
      });

      const chunks: ChatStreamChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].finished).toBe(true);
      expect(chunks[0].error).toContain('Message content cannot be empty');

      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should handle cancellation via AbortSignal', async () => {
      const controller = new AbortController();

      const loggerModule = await import('../../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      // Cancel after short delay
      setTimeout(() => controller.abort(), 100);

      const stream = chatService.createMessageStream({
        content: 'Hello',
        conversationId: 'conv-1',
        signal: controller.signal,
      });

      const chunks: ChatStreamChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Should receive cancellation error
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.finished).toBe(true);
      expect(finalChunk.error).toBe('Request was cancelled');

      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should update conversation title for first exchange', async () => {
      (mockMessageService.countByConversation as Mock).mockResolvedValue(2); // First exchange
      (mockConversationService.generateTitle as Mock).mockReturnValue('Generated Title');

      const stream = chatService.createMessageStream({
        content: 'Hello',
        conversationId: 'conv-1',
      });

      // Consume stream
      for await (const chunk of stream) {
        if (chunk.finished) break;
      }

      expect(mockConversationService.generateTitle).toHaveBeenCalledWith('Hello');
      expect(mockConversationService.updateTitle).toHaveBeenCalledWith('conv-1', 'Generated Title');
    });

    it('should not update title for subsequent messages', async () => {
      (mockMessageService.countByConversation as Mock).mockResolvedValue(4); // Not first exchange

      const stream = chatService.createMessageStream({
        content: 'Another message',
        conversationId: 'conv-1',
      });

      // Consume stream
      for await (const chunk of stream) {
        if (chunk.finished) break;
      }

      expect(mockConversationService.generateTitle).not.toHaveBeenCalled();
      expect(mockConversationService.updateTitle).not.toHaveBeenCalled();
    });

    it('should update conversation activity', async () => {
      const stream = chatService.createMessageStream({
        content: 'Hello',
        conversationId: 'conv-1',
      });

      // Consume stream
      for await (const chunk of stream) {
        if (chunk.finished) break;
      }

      expect(mockConversationService.updateActivity).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('fallback for non-streaming assistants', () => {
    let nonStreamingAssistant: any;

    beforeEach(() => {
      // Create assistant without streaming support
      nonStreamingAssistant = {
        getResponse: vi.fn().mockResolvedValue({
          response: 'Non-streaming response',
          model: 'non-streaming-model',
          cost: 0.002,
        }),
      };

      chatService = new DatabaseChatService(
        mockConversationService,
        mockMessageService,
        nonStreamingAssistant,
      );
    });

    it('should simulate streaming for non-streaming assistants', async () => {
      const chunks: ChatStreamChunk[] = [];

      const stream = chatService.createMessageStream({
        content: 'Hello',
        conversationId: 'conv-1',
      });

      for await (const chunk of stream) {
        chunks.push(chunk);
        if (chunk.finished) break;
      }

      // Should have simulated streaming by word chunks
      expect(chunks.length).toBeGreaterThan(2);

      // Check that words were streamed
      const streamingChunks = chunks.slice(0, -1);
      const fullResponse = streamingChunks.map((c) => c.content).join('');
      expect(fullResponse).toBe('Non-streaming response');

      // Final chunk should indicate completion
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.finished).toBe(true);
    });
  });
});

describe('DemoChatService Streaming', () => {
  let demoService: DemoChatService;

  beforeEach(() => {
    demoService = new DemoChatService();
  });

  describe('createMessageStream', () => {
    it('should stream demo response', async () => {
      const chunks: ChatStreamChunk[] = [];

      const stream = demoService.createMessageStream({
        content: 'Hello demo',
        conversationId: 'demo-conv',
      });

      for await (const chunk of stream) {
        chunks.push(chunk);
        if (chunk.finished) break;
      }

      // Should have multiple chunks
      expect(chunks.length).toBeGreaterThan(5);

      // All streaming chunks should have demo metadata
      const streamingChunks = chunks.slice(0, -1);
      streamingChunks.forEach((chunk) => {
        expect(chunk.finished).toBe(false);
        expect(chunk.metadata?.model).toBe('demo');
      });

      // Final chunk should be completion
      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.finished).toBe(true);
      expect(finalChunk.metadata?.messageId).toBeTruthy();
    });

    it('should validate demo messages', async () => {
      const loggerModule = await import('../../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      const stream = demoService.createMessageStream({
        content: '', // Invalid
        conversationId: 'demo-conv',
      });

      const chunks: ChatStreamChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].error).toContain('Message content cannot be empty');

      expect(loggerErrorSpy).toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });

    it('should handle demo cancellation', async () => {
      const controller = new AbortController();
      const loggerModule = await import('../../../utils/logger');
      const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => {});

      setTimeout(() => controller.abort(), 50);

      const stream = demoService.createMessageStream({
        content: 'Hello',
        conversationId: 'demo-conv',
        signal: controller.signal,
      });

      const chunks: ChatStreamChunk[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const finalChunk = chunks[chunks.length - 1];
      expect(finalChunk.finished).toBe(true);
      expect(finalChunk.error).toBe('Request was cancelled');

      expect(loggerErrorSpy).not.toHaveBeenCalled();

      loggerErrorSpy.mockRestore();
    });
  });
});

// Integration test with real MockAssistant streaming
describe('ChatService with MockAssistant Integration', () => {
  let chatService: DatabaseChatService;
  let mockAssistant: MockAssistant;

  beforeEach(() => {
    vi.clearAllMocks();
    // Make mock assistant deterministic for predictable test outcomes
    vi.spyOn(Math, 'random').mockReturnValue(0);

    mockAssistant = new MockAssistant();
    chatService = new DatabaseChatService(
      mockConversationService,
      mockMessageService,
      mockAssistant,
    );

    // Setup mocks
    (mockConversationService.validateAccess as Mock).mockResolvedValue({
      id: 'conv-1',
      title: 'Test Conversation',
    });

    (mockMessageService.getConversationHistory as Mock).mockResolvedValue([]);
    (mockMessageService.countByConversation as Mock).mockResolvedValue(2);
    (mockMessageService.estimateTokens as Mock).mockReturnValue(10);

    (mockMessageService.create as Mock)
      .mockResolvedValueOnce({ id: 'msg-1', role: 'user', content: 'Hello' })
      .mockResolvedValueOnce({
        id: 'msg-2',
        role: 'assistant',
        content: 'Response',
        tokens: 10,
        cost: 0.001,
      });
  });

  it('should stream real chunks from MockAssistant', async () => {
    const chunks: ChatStreamChunk[] = [];

    const stream = chatService.createMessageStream({
      content: 'Tell me a story',
      conversationId: 'conv-1',
    });

    for await (const chunk of stream) {
      chunks.push(chunk);
      if (chunk.finished) break;
    }

    // Verify we got realistic streaming behavior
    expect(chunks.length).toBeGreaterThan(3);

    // Check chunk structure
    const streamingChunks = chunks.slice(0, -1);
    streamingChunks.forEach((chunk) => {
      expect(chunk.finished).toBe(false);
      expect(typeof chunk.content).toBe('string');
      expect(chunk.metadata?.model).toBe('mock-assistant');
      expect(chunk.metadata?.tokenCount).toBe(1);
    });

    // Verify final completion chunk
    const finalChunk = chunks[chunks.length - 1];
    expect(finalChunk.finished).toBe(true);
    expect(finalChunk.content).toBe('');
    expect(finalChunk.metadata?.messageId).toBeTruthy();
  });
});
