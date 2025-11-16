/**
 * ConversationSummarizationService
 *
 * Handles progressive summarization of conversation history to manage context window limits.
 * Uses a rolling summary approach where old messages are periodically summarized.
 */

import type { PrismaClient, ConversationSummary, Message } from '@prisma/client';
import { logger } from '../../utils/logger';
import { countConversationTokens, countMessageTokens } from '../../utils/tokenCounter';
import type { Assistant } from '../assistant';

export interface SummarizationConfig {
  /** Number of messages to trigger summarization */
  messageTriggerThreshold: number;
  /** Token count to trigger summarization */
  tokenTriggerThreshold: number;
  /** How many recent messages to keep verbatim */
  recentMessageWindow: number;
  /** Model to use for generating summaries (use cheap model like DeepSeek) */
  summaryModel: string;
  /** Enable automatic background summarization */
  enabled: boolean;
}

export interface SummarizationResult {
  summaryId: string;
  summaryContent: string;
  messagesSummarized: number;
  tokensSaved: number;
}

const DEFAULT_CONFIG: SummarizationConfig = {
  messageTriggerThreshold: 100, // Summarize after 100 messages
  tokenTriggerThreshold: 50000, // Or after 50k tokens
  recentMessageWindow: 50, // Keep last 50 messages verbatim
  summaryModel: 'deepseek/deepseek-chat', // Cost-effective model
  enabled: process.env.ENABLE_SUMMARIZATION === 'true',
};

export class ConversationSummarizationService {
  constructor(
    private db: PrismaClient,
    private assistant: Assistant,
    private config: SummarizationConfig = DEFAULT_CONFIG,
  ) {}

  /**
   * Check if a conversation needs summarization
   */
  async needsSummarization(conversationId: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, content: true, role: true },
        },
        summaries: {
          where: { supersededBy: null }, // Only active summaries
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      return false;
    }

    // Calculate unsummarized message count
    const lastSummary = conversation.summaries[0];
    let unsummarizedMessages = conversation.messages;

    if (lastSummary) {
      const messageRange = lastSummary.messageRange as { endMessageId: string };
      const endIndex = conversation.messages.findIndex((m) => m.id === messageRange.endMessageId);
      unsummarizedMessages = conversation.messages.slice(endIndex + 1);
    }

    // Check message count threshold
    if (unsummarizedMessages.length >= this.config.messageTriggerThreshold) {
      logger.debug('Summarization needed: message count threshold exceeded', {
        conversationId,
        messageCount: unsummarizedMessages.length,
        threshold: this.config.messageTriggerThreshold,
      });
      return true;
    }

    // Check token count threshold
    const tokenCount = countConversationTokens(
      unsummarizedMessages.map((m) => ({ role: m.role, content: m.content })),
      conversation.model,
    );

    if (tokenCount >= this.config.tokenTriggerThreshold) {
      logger.debug('Summarization needed: token count threshold exceeded', {
        conversationId,
        tokenCount,
        threshold: this.config.tokenTriggerThreshold,
      });
      return true;
    }

    return false;
  }

  /**
   * Generate a rolling summary for old messages in a conversation
   */
  async summarizeConversation(conversationId: string): Promise<SummarizationResult | null> {
    if (!this.config.enabled) {
      logger.debug('Summarization disabled, skipping', { conversationId });
      return null;
    }

    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, content: true, role: true, createdAt: true, tokens: true },
        },
        summaries: {
          where: { supersededBy: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Determine which messages to summarize
    const lastSummary = conversation.summaries[0];
    let messagesToSummarize: typeof conversation.messages;
    let startIndex = 0;

    if (lastSummary) {
      // Resume from last summary
      const messageRange = lastSummary.messageRange as { endMessageId: string };
      const endIndex = conversation.messages.findIndex((m) => m.id === messageRange.endMessageId);
      startIndex = endIndex + 1;
    }

    // Calculate how many messages to summarize (leave recentMessageWindow untouched)
    const totalMessages = conversation.messages.length;
    const endIndex = Math.max(startIndex, totalMessages - this.config.recentMessageWindow);

    if (endIndex <= startIndex) {
      logger.debug('No messages to summarize', {
        conversationId,
        totalMessages,
        recentWindow: this.config.recentMessageWindow,
      });
      return null;
    }

    messagesToSummarize = conversation.messages.slice(startIndex, endIndex);

    if (messagesToSummarize.length === 0) {
      return null;
    }

    // Generate summary using AI
    const summaryContent = await this.generateSummary(
      messagesToSummarize,
      lastSummary?.summaryContent,
      conversation.model,
    );

    // Calculate tokens saved
    const originalTokens = countConversationTokens(
      messagesToSummarize.map((m) => ({ role: m.role, content: m.content })),
      conversation.model,
    );
    const summaryTokens = countMessageTokens(summaryContent, conversation.model);
    const tokensSaved = originalTokens - summaryTokens;

    // Store summary in database
    const summary = await this.db.conversationSummary.create({
      data: {
        conversationId,
        summaryContent,
        messageRange: {
          startMessageId: messagesToSummarize[0].id,
          endMessageId: messagesToSummarize[messagesToSummarize.length - 1].id,
          startIndex,
          endIndex,
        },
        tokensSaved,
        messageCount: messagesToSummarize.length,
      },
    });

    logger.info('Conversation summarized', {
      conversationId,
      summaryId: summary.id,
      messagesSummarized: messagesToSummarize.length,
      tokensSaved,
      compressionRatio: ((1 - summaryTokens / originalTokens) * 100).toFixed(1) + '%',
    });

    return {
      summaryId: summary.id,
      summaryContent,
      messagesSummarized: messagesToSummarize.length,
      tokensSaved,
    };
  }

  /**
   * Generate a summary using AI
   */
  private async generateSummary(
    messages: Array<{ role: string; content: string }>,
    previousSummary?: string,
    model?: string,
  ): Promise<string> {
    const messagesText = messages
      .map((m, i) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n');

    const systemPrompt = `You are a conversation summarization assistant. Your task is to create a concise but comprehensive summary of a conversation segment.

INSTRUCTIONS:
- Capture key topics, decisions, and important details
- Maintain chronological flow
- Preserve technical details, code snippets, and specific information
- Use clear, structured format
- Keep the summary concise but informative (aim for 80% compression)
${previousSummary ? '\n- Build upon the previous summary to create a rolling summary' : ''}`;

    const userPrompt = previousSummary
      ? `Previous summary of earlier messages:
---
${previousSummary}
---

New messages to incorporate into the summary:
---
${messagesText}
---

Please create an updated summary that incorporates both the previous summary and the new messages.`
      : `Messages to summarize:
---
${messagesText}
---

Please create a comprehensive summary of this conversation segment.`;

    try {
      const conversationHistory = [
        { role: 'system', content: systemPrompt },
      ];

      const response = await this.assistant.getResponse(
        userPrompt,
        conversationHistory,
        {
          model: this.config.summaryModel,
        },
      );

      // Handle both string and AssistantResponse
      return typeof response === 'string' ? response : response.response;
    } catch (error) {
      logger.error('Failed to generate summary', error as Error, {
        messageCount: messages.length,
        model: this.config.summaryModel,
      });
      throw new Error('Summary generation failed');
    }
  }

  /**
   * Get active summaries for a conversation
   */
  async getActiveSummaries(conversationId: string): Promise<ConversationSummary[]> {
    return this.db.conversationSummary.findMany({
      where: {
        conversationId,
        supersededBy: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Manually trigger summarization for a conversation
   */
  async triggerSummarization(conversationId: string): Promise<SummarizationResult | null> {
    logger.info('Manual summarization triggered', { conversationId });
    return this.summarizeConversation(conversationId);
  }

  /**
   * Get summarization statistics for a conversation
   */
  async getStats(conversationId: string): Promise<{
    totalMessages: number;
    summarizedMessages: number;
    unsummarizedMessages: number;
    summaryCount: number;
    totalTokensSaved: number;
  }> {
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: true,
        summaries: {
          where: { supersededBy: null },
        },
      },
    });

    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const totalMessages = conversation.messages.length;
    const summarizedMessages = conversation.summaries.reduce(
      (sum, s) => sum + s.messageCount,
      0,
    );
    const totalTokensSaved = conversation.summaries.reduce((sum, s) => sum + s.tokensSaved, 0);

    return {
      totalMessages,
      summarizedMessages,
      unsummarizedMessages: totalMessages - summarizedMessages,
      summaryCount: conversation.summaries.length,
      totalTokensSaved,
    };
  }
}
