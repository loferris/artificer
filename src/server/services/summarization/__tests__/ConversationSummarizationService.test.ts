import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationSummarizationService } from '../ConversationSummarizationService';
import type { PrismaClient } from '@prisma/client';
import type { Assistant } from '../../assistant/assistant';

describe('ConversationSummarizationService', () => {
  let mockDb: any;
  let mockAssistant: any;
  let service: ConversationSummarizationService;

  beforeEach(() => {
    // Mock Prisma client
    mockDb = {
      conversation: {
        findUnique: vi.fn(),
      },
      conversationSummary: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };

    // Mock Assistant
    mockAssistant = {
      getResponse: vi.fn(),
    };

    // Create service with explicit config (enabled: true)
    service = new ConversationSummarizationService(
      mockDb as unknown as PrismaClient,
      mockAssistant as unknown as AssistantService,
      {
        messageTriggerThreshold: 100,
        tokenTriggerThreshold: 50000,
        recentMessageWindow: 50,
        summaryModel: 'deepseek/deepseek-chat',
        enabled: true, // Explicitly enable for tests
      },
    );
  });

  describe('needsSummarization', () => {
    it('should return false when summarization is disabled', async () => {
      const disabledService = new ConversationSummarizationService(
        mockDb as unknown as PrismaClient,
        mockAssistant as unknown as AssistantService,
        {
          messageTriggerThreshold: 100,
          tokenTriggerThreshold: 50000,
          recentMessageWindow: 50,
          summaryModel: 'deepseek/deepseek-chat',
          enabled: false, // Explicitly disable
        },
      );

      const result = await disabledService.needsSummarization('conv-123');
      expect(result).toBe(false);
    });

    it('should return false when conversation not found', async () => {
      mockDb.conversation.findUnique.mockResolvedValue(null);

      const result = await service.needsSummarization('conv-123');
      expect(result).toBe(false);
    });

    it('should return true when message threshold exceeded', async () => {
      // Create enough messages to exceed threshold
      // Default threshold is 100 messages, so 150 should trigger
      const messages = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'Test message',
      }));

      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        model: 'gpt-4',
        messages,
        summaries: [],
      });

      const result = await service.needsSummarization('conv-123');
      expect(result).toBe(true);
    });

    it('should return true when token threshold exceeded', async () => {
      // Create messages with very long content that exceeds token threshold (50k tokens)
      // Each message needs to be very long to reach 50k+ tokens with fewer than 100 messages
      const longContent = 'word '.repeat(5000); // ~20k tokens per message

      const messages = Array.from({ length: 10 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: longContent, // Each message has ~20k tokens
      }));

      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        model: 'gpt-4',
        messages, // 10 messages * 20k tokens = ~200k tokens, far exceeds 50k threshold
        summaries: [],
      });

      const result = await service.needsSummarization('conv-123');
      expect(result).toBe(true);
    });

    it('should only check unsummarized messages', async () => {
      const messages = [
        { id: 'msg-1', role: 'user', content: 'Old message 1' },
        { id: 'msg-2', role: 'assistant', content: 'Old response 1' },
        { id: 'msg-3', role: 'user', content: 'Recent message' },
        { id: 'msg-4', role: 'assistant', content: 'Recent response' },
      ];

      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        model: 'gpt-4',
        messages,
        summaries: [
          {
            messageRange: { endMessageId: 'msg-2' },
            supersededBy: null,
          },
        ],
      });

      const result = await service.needsSummarization('conv-123');
      // Only 2 unsummarized messages, should not trigger
      expect(result).toBe(false);
    });
  });

  describe('summarizeConversation', () => {
    it('should return null when summarization is disabled', async () => {
      const disabledService = new ConversationSummarizationService(
        mockDb as unknown as PrismaClient,
        mockAssistant as unknown as AssistantService,
        {
          messageTriggerThreshold: 100,
          tokenTriggerThreshold: 50000,
          recentMessageWindow: 50,
          summaryModel: 'deepseek/deepseek-chat',
          enabled: false,
        },
      );

      const result = await disabledService.summarizeConversation('conv-123');
      expect(result).toBeNull();
    });

    it('should throw when conversation not found', async () => {
      mockDb.conversation.findUnique.mockResolvedValue(null);

      await expect(service.summarizeConversation('conv-123')).rejects.toThrow(
        'Conversation not found: conv-123',
      );
    });

    it('should return null when no messages to summarize', async () => {
      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        model: 'gpt-4',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Recent 1' },
          { id: 'msg-2', role: 'assistant', content: 'Recent 2' },
        ],
        summaries: [],
      });

      const result = await service.summarizeConversation('conv-123');
      // Only 2 messages, below the recentMessageWindow (50)
      expect(result).toBeNull();
    });

    it('should generate summary for old messages', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        createdAt: new Date(),
        tokens: 10,
      }));

      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        model: 'gpt-4',
        messages,
        summaries: [],
      });

      mockAssistant.getResponse.mockResolvedValue('This is a summary of the conversation.');

      mockDb.conversationSummary.create.mockResolvedValue({
        id: 'summary-1',
        summaryContent: 'This is a summary of the conversation.',
        messageCount: 50,
        tokensSaved: 200,
      });

      const result = await service.summarizeConversation('conv-123');

      expect(result).not.toBeNull();
      expect(result!.summaryContent).toBe('This is a summary of the conversation.');
      expect(result!.messagesSummarized).toBeGreaterThan(0);
      expect(result!.tokensSaved).toBeGreaterThan(0);
      expect(mockAssistant.getResponse).toHaveBeenCalled();
      expect(mockDb.conversationSummary.create).toHaveBeenCalled();
    });

    it('should build on previous summary', async () => {
      const messages = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        createdAt: new Date(),
        tokens: 10,
      }));

      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        model: 'gpt-4',
        messages,
        summaries: [
          {
            summaryContent: 'Previous summary content',
            messageRange: { endMessageId: 'msg-50' },
            supersededBy: null,
            createdAt: new Date(),
          },
        ],
      });

      mockAssistant.getResponse.mockResolvedValue('Updated summary with new messages.');

      mockDb.conversationSummary.create.mockResolvedValue({
        id: 'summary-2',
        summaryContent: 'Updated summary with new messages.',
        messageCount: 50,
        tokensSaved: 200,
      });

      const result = await service.summarizeConversation('conv-123');

      expect(result).not.toBeNull();
      // Check that the assistant was called with both previous summary and new messages
      const getResponseCall = mockAssistant.getResponse.mock.calls[0];
      // First arg is user prompt, second is conversation history
      expect(getResponseCall[0]).toContain('Previous summary');
      expect(getResponseCall[1]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
        ]),
      );
    });
  });

  describe('getActiveSummaries', () => {
    it('should return only active summaries', async () => {
      const activeSummaries = [
        { id: 'summary-1', summaryContent: 'Active 1', supersededBy: null },
        { id: 'summary-2', summaryContent: 'Active 2', supersededBy: null },
      ];

      mockDb.conversationSummary.findMany.mockResolvedValue(activeSummaries);

      const result = await service.getActiveSummaries('conv-123');

      expect(result).toHaveLength(2);
      expect(mockDb.conversationSummary.findMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-123',
          supersededBy: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  });

  describe('getStats', () => {
    it('should return summarization statistics', async () => {
      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        messages: Array(100).fill({ id: 'msg' }),
        summaries: [
          { messageCount: 30, tokensSaved: 500, supersededBy: null },
          { messageCount: 20, tokensSaved: 300, supersededBy: null },
        ],
      });

      const stats = await service.getStats('conv-123');

      expect(stats.totalMessages).toBe(100);
      expect(stats.summarizedMessages).toBe(50);
      expect(stats.unsummarizedMessages).toBe(50);
      expect(stats.summaryCount).toBe(2);
      expect(stats.totalTokensSaved).toBe(800);
    });

    it('should throw when conversation not found', async () => {
      mockDb.conversation.findUnique.mockResolvedValue(null);

      await expect(service.getStats('conv-123')).rejects.toThrow('Conversation not found: conv-123');
    });
  });

  describe('triggerSummarization', () => {
    it('should call summarizeConversation', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        createdAt: new Date(),
        tokens: 10,
      }));

      mockDb.conversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        model: 'gpt-4',
        messages,
        summaries: [],
      });

      mockAssistant.getResponse.mockResolvedValue('Summary content');

      mockDb.conversationSummary.create.mockResolvedValue({
        id: 'summary-1',
        summaryContent: 'Summary content',
        messageCount: 50,
        tokensSaved: 200,
      });

      const result = await service.triggerSummarization('conv-123');

      expect(result).not.toBeNull();
      expect(result!.summaryContent).toBe('Summary content');
    });
  });
});
