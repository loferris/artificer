import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';

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
   */
  getConversationHistory(conversationId: string): Promise<Array<{ role: string; content: string }>>;

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
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        content: true,
      },
    });

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
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
    // Initialize with sample message
    const sampleMessage: Message = {
      id: 'demo-msg-1',
      role: 'assistant',
      content:
        'Welcome to this AI chat application! This is a showcase demo featuring real-time AI conversations, conversation management, export functionality, and more!',
      tokens: 25,
      createdAt: new Date(Date.now() - 3600000),
      conversationId: 'demo-1',
      parentId: null,
    };

    this.messages.set('demo-msg-1', sampleMessage);
    this.conversationMessages.set('demo-1', ['demo-msg-1']);
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
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.getByConversation(conversationId);
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
