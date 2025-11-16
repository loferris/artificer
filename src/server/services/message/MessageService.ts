import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';
import { DEMO_CONFIG } from '../../config/demo';
import {
  countConversationTokens,
  estimateMessageFit,
  calculateContextWindow,
} from '../../utils/tokenCounter';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number | null;
  createdAt: Date;
  conversationId: string;
  parentId: string | null;
}

export interface CreateMessageInput {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parentId?: string | null;
}

export interface UpdateMessageInput {
  content: string;
}

export interface MessageWithCost extends Message {
  cost: number;
  model?: string;
  timestamp: Date;
}

export interface MessageService {
  /**
   * Create a new message in a conversation
   */
  create(input: CreateMessageInput): Promise<Message>;

  /**
   * Get message by ID
   */
  getById(messageId: string): Promise<Message | null>;

  /**
   * Get all messages in a conversation
   */
  getByConversation(conversationId: string): Promise<MessageWithCost[]>;

  /**
   * Get all messages in a conversation - wrapper for consistency
   */
  getMessagesByConversation(conversationId: string): Promise<MessageWithCost[]>;

  /**
   * Update message content
   */
  update(messageId: string, input: UpdateMessageInput): Promise<Message>;

  /**
   * Delete a message
   */
  delete(messageId: string): Promise<void>;

  /**
   * Get conversation history formatted for AI assistant
   * Includes summaries and recent messages within token budget
   */
  getConversationHistory(
    conversationId: string,
    options?: {
      maxTokens?: number;
      model?: string;
    },
  ): Promise<Array<{ role: string; content: string }>>;

  /**
   * Estimate token count from text content
   */
  estimateTokens(content: string): number;

  /**
   * Calculate estimated cost based on tokens and model
   */
  calculateCost(tokens: number, model?: string): number;

  /**
   * Create multiple messages in a transaction
   */
  createBatch(messages: CreateMessageInput[]): Promise<Message[]>;

  /**
   * Count messages in a conversation
   */
  countByConversation(conversationId: string): Promise<number>;
}

export class DatabaseMessageService implements MessageService {
  constructor(private db: PrismaClient) {}

  async create(input: CreateMessageInput): Promise<Message> {
    const tokens = this.estimateTokens(input.content);

    const message = await this.db.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        tokens,
        parentId: input.parentId || null,
      },
    });

    return this.transformMessage(message);
  }

  async getById(messageId: string): Promise<Message | null> {
    const message = await this.db.message.findUnique({
      where: { id: messageId },
    });

    return message ? this.transformMessage(message) : null;
  }

  async getByConversation(conversationId: string): Promise<MessageWithCost[]> {
    const messages = await this.db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => {
      const baseMessage = this.transformMessage(msg);
      return {
        ...baseMessage,
        cost: this.calculateCost(msg.tokens || 0),
        model: undefined, // Model info not stored in message yet
        timestamp: msg.createdAt,
      };
    });
  }

  async update(messageId: string, input: UpdateMessageInput): Promise<Message> {
    // Check if message exists
    const existingMessage = await this.db.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
      });
    }

    const tokens = this.estimateTokens(input.content);

    const message = await this.db.message.update({
      where: { id: messageId },
      data: {
        content: input.content,
        tokens,
      },
    });

    return this.transformMessage(message);
  }

  async delete(messageId: string): Promise<void> {
    // Check if message exists
    const message = await this.db.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
      });
    }

    await this.db.message.delete({
      where: { id: messageId },
    });
  }

  async getConversationHistory(
    conversationId: string,
    options?: {
      maxTokens?: number;
      model?: string;
    },
  ): Promise<Array<{ role: string; content: string }>> {
    // Get conversation model if not provided
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      select: { model: true },
    });

    const model = options?.model || conversation?.model || 'gpt-4';

    // Calculate context window configuration
    const contextConfig = calculateContextWindow();
    const maxTokens = options?.maxTokens || contextConfig.recentMessagesWindow;

    // Get all messages
    const messages = await this.db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
      },
    });

    // Get active summaries
    const summaries = await this.db.conversationSummary.findMany({
      where: {
        conversationId,
        supersededBy: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        summaryContent: true,
        messageRange: true,
      },
    });

    // Determine which messages are already summarized
    let unsummarizedStartIndex = 0;
    if (summaries.length > 0) {
      const lastSummary = summaries[summaries.length - 1];
      const messageRange = lastSummary.messageRange as { endMessageId: string };
      const endIndex = messages.findIndex((m) => m.id === messageRange.endMessageId);
      unsummarizedStartIndex = endIndex + 1;
    }

    const unsummarizedMessages = messages.slice(unsummarizedStartIndex);

    // Determine how many recent messages fit in token budget
    const { count: messageFit } = estimateMessageFit(
      unsummarizedMessages.map((m) => ({ role: m.role, content: m.content })),
      maxTokens,
      model,
    );

    // Take the most recent messages that fit
    const recentMessages = unsummarizedMessages.slice(-messageFit);

    // Build final history: summaries + recent messages
    const history: Array<{ role: string; content: string }> = [];

    // Add summaries as system messages
    for (const summary of summaries) {
      history.push({
        role: 'system',
        content: `[Previous conversation summary]\n${summary.summaryContent}`,
      });
    }

    // Add recent messages
    for (const msg of recentMessages) {
      history.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return history;
  }

  estimateTokens(content: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplification; real tokenization would use the actual model's tokenizer
    return Math.ceil(content.length / 4);
  }

  calculateCost(tokens: number, model?: string): number {
    // Cost per token for different models (rough estimates)
    const costPerToken: Record<string, number> = {
      'anthropic/claude-3-haiku': 0.00000025,
      'anthropic/claude-3-sonnet': 0.000003,
      'anthropic/claude-3-opus': 0.000015,
      'meta-llama/llama-3.1-8b-instruct': 0.0000002,
      'openai/gpt-4o-mini': 0.00000015,
      'deepseek-chat': 0.0000002,
    };

    const rate = model ? costPerToken[model] || 0.000001 : 0.000002; // Default rate
    return tokens * rate;
  }

  async createBatch(messages: CreateMessageInput[]): Promise<Message[]> {
    const createdMessages = await this.db.$transaction(
      messages.map((input) =>
        this.db.message.create({
          data: {
            conversationId: input.conversationId,
            role: input.role,
            content: input.content,
            tokens: this.estimateTokens(input.content),
            parentId: input.parentId || null,
          },
        }),
      ),
    );

    return createdMessages.map((msg) => this.transformMessage(msg));
  }

  async countByConversation(conversationId: string): Promise<number> {
    return this.db.message.count({
      where: { conversationId },
    });
  }

  // Wrapper methods for router compatibility
  async createMessage(input: CreateMessageInput & { tokens?: number }): Promise<Message> {
    return this.create(input);
  }

  async getMessagesByConversation(conversationId: string): Promise<MessageWithCost[]> {
    return this.getByConversation(conversationId);
  }

  async updateMessage(messageId: string, input: UpdateMessageInput): Promise<Message> {
    return this.update(messageId, input);
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    await this.delete(messageId);
    return { success: true };
  }

  private transformMessage(message: any): Message {
    return {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content,
      tokens: message.tokens,
      createdAt: message.createdAt,
      conversationId: message.conversationId,
      parentId: message.parentId,
    };
  }
}

/**
 * Demo mode implementation that uses in-memory storage
 */
export class DemoMessageService implements MessageService {
  private messages = new Map<string, Message>();
  private conversationMessages = new Map<string, string[]>(); // conversationId -> messageIds[]

  constructor() {
    // Initialize with demo conversation messages from config
    
    DEMO_CONFIG.SAMPLE_CONVERSATIONS.forEach((demoConv: any) => {
      const messageIds: string[] = [];
      
      demoConv.messages.forEach((msg: any, index: number) => {
        const messageId = `${demoConv.id}-msg-${index + 1}`;
        const message: Message = {
          id: messageId,
          role: msg.role,
          content: msg.content,
          tokens: Math.ceil(msg.content.length / 4),
          createdAt: msg.timestamp,
          conversationId: demoConv.id,
          parentId: null,
        };
        
        this.messages.set(messageId, message);
        messageIds.push(messageId);
      });
      
      this.conversationMessages.set(demoConv.id, messageIds);
    });
  }

  async create(input: CreateMessageInput): Promise<Message> {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: Message = {
      id,
      role: input.role,
      content: input.content,
      tokens: this.estimateTokens(input.content),
      createdAt: new Date(),
      conversationId: input.conversationId,
      parentId: input.parentId || null,
    };

    this.messages.set(id, message);

    // Add to conversation message list
    const conversationMsgIds = this.conversationMessages.get(input.conversationId) || [];
    conversationMsgIds.push(id);
    this.conversationMessages.set(input.conversationId, conversationMsgIds);

    return message;
  }

  async getById(messageId: string): Promise<Message | null> {
    return this.messages.get(messageId) || null;
  }

  async getByConversation(conversationId: string): Promise<MessageWithCost[]> {
    const messageIds = this.conversationMessages.get(conversationId) || [];
    const messages = messageIds
      .map((id) => this.messages.get(id))
      .filter((msg): msg is Message => msg !== undefined)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return messages.map((msg) => ({
      ...msg,
      cost: this.calculateCost(msg.tokens || 0),
      model: 'demo-assistant-v1',
      timestamp: msg.createdAt,
    }));
  }

  async update(messageId: string, input: UpdateMessageInput): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
      });
    }

    const updated = {
      ...message,
      content: input.content,
      tokens: this.estimateTokens(input.content),
    };

    this.messages.set(messageId, updated);
    return updated;
  }

  async delete(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Message not found',
      });
    }

    this.messages.delete(messageId);

    // Remove from conversation message list
    const conversationMsgIds = this.conversationMessages.get(message.conversationId) || [];
    const filteredIds = conversationMsgIds.filter((id) => id !== messageId);
    this.conversationMessages.set(message.conversationId, filteredIds);
  }

  async getConversationHistory(
    conversationId: string,
    options?: {
      maxTokens?: number;
      model?: string;
    },
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.getByConversation(conversationId);

    // Simple implementation for demo mode - just return all messages
    // In production mode, this would use token-based windowing
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  calculateCost(tokens: number, model?: string): number {
    // Simple demo cost calculation
    return tokens * 0.001;
  }

  async createBatch(messages: CreateMessageInput[]): Promise<Message[]> {
    const results = [];
    for (const input of messages) {
      const message = await this.create(input);
      results.push(message);
    }
    return results;
  }

  async countByConversation(conversationId: string): Promise<number> {
    return (this.conversationMessages.get(conversationId) || []).length;
  }

  // Wrapper methods for router compatibility
  async createMessage(input: CreateMessageInput & { tokens?: number }): Promise<Message> {
    return this.create(input);
  }

  async getMessagesByConversation(conversationId: string): Promise<MessageWithCost[]> {
    return this.getByConversation(conversationId);
  }

  async updateMessage(messageId: string, input: UpdateMessageInput): Promise<Message> {
    return this.update(messageId, input);
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    await this.delete(messageId);
    return { success: true };
  }
}
