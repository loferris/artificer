import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@prisma/client';

export interface ConversationWithMessages {
  id: string;
  title: string | null;
  model: string;
  systemPrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    tokens: number | null;
    createdAt: Date;
    parentId: string | null;
  }>;
}

export interface CreateConversationInput {
  title?: string | null;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  firstMessage?: string;
}

export interface UpdateConversationInput {
  title?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ConversationListItem {
  id: string;
  title: string;
  model: string;
  systemPrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessagePreview?: string;
}

export interface ConversationService {
  /**
   * Create a new conversation with default settings
   */
  create(input?: CreateConversationInput): Promise<ConversationWithMessages>;

  /**
   * Get conversation by ID with all messages
   */
  getById(conversationId: string): Promise<ConversationWithMessages | null>;

  /**
   * List all conversations with summary information
   */
  list(): Promise<ConversationListItem[]>;

  /**
   * List all conversations - wrapper around list() for consistency
   */
  listConversations(): Promise<ConversationListItem[]>;

  /**
   * Update conversation metadata
   */
  update(conversationId: string, input: UpdateConversationInput): Promise<ConversationWithMessages>;

  /**
   * Delete conversation and all its messages
   */
  delete(conversationId: string): Promise<void>;

  /**
   * Generate and update conversation title from first message
   */
  generateTitle(firstMessage: string): string;

  /**
   * Update conversation title and timestamp
   */
  updateTitle(conversationId: string, title: string): Promise<ConversationWithMessages>;

  /**
   * Check if conversation exists and user has access
   */
  validateAccess(conversationId: string, userId?: string): Promise<ConversationWithMessages>;

  /**
   * Update conversation's last activity timestamp
   */
  updateActivity(conversationId: string): Promise<void>;
}

export class DatabaseConversationService implements ConversationService {
  constructor(private db: PrismaClient) {}

  async create(input: CreateConversationInput = {}): Promise<ConversationWithMessages> {
    const { firstMessage, ...conversationData } = input;

    const conversation = await this.db.$transaction(async (prisma) => {
      const newConv = await prisma.conversation.create({
        data: {
          title: conversationData.title ?? null,
          model:
            conversationData.model ||
            (process.env.OPENROUTER_MODEL && process.env.OPENROUTER_MODEL.trim() !== ''
              ? process.env.OPENROUTER_MODEL
              : null) ||
            (process.env.OPENROUTER_DEFAULT_MODEL &&
            process.env.OPENROUTER_DEFAULT_MODEL.trim() !== ''
              ? process.env.OPENROUTER_DEFAULT_MODEL
              : null) ||
            'deepseek-chat',
          systemPrompt: conversationData.systemPrompt ?? 'You are a helpful AI assistant.',
          temperature: conversationData.temperature ?? 0.7,
          maxTokens: conversationData.maxTokens ?? 1000,
        },
      });

      if (firstMessage) {
        await prisma.message.create({
          data: {
            conversationId: newConv.id,
            role: 'user',
            content: firstMessage,
          },
        });
      }

      return newConv;
    });

    // Refetch with messages to return the full object
    return this.getById(conversation.id).then((c) => {
      if (!c) throw new Error('Failed to fetch newly created conversation');
      return c;
    });
  }

  async getById(conversationId: string): Promise<ConversationWithMessages | null> {
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return conversation ? this.transformConversation(conversation) : null;
  }

  async list(): Promise<ConversationListItem[]> {
    const conversations = await this.db.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Get first message for preview
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return conversations.map((conv) => ({
      id: conv.id,
      title: conv.title || this.generateTitle(conv.messages[0]?.content || 'New Conversation'),
      model: conv.model,
      systemPrompt: conv.systemPrompt,
      temperature: conv.temperature,
      maxTokens: conv.maxTokens,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv._count.messages,
      lastMessagePreview: conv.messages[0]?.content.substring(0, 100),
    }));
  }

  async update(
    conversationId: string,
    input: UpdateConversationInput,
  ): Promise<ConversationWithMessages> {
    const conversation = await this.db.conversation.update({
      where: { id: conversationId },
      data: input,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.transformConversation(conversation);
  }

  async delete(conversationId: string): Promise<void> {
    // Check if conversation exists
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    // Delete messages first due to foreign key constraints
    await this.db.message.deleteMany({
      where: { conversationId },
    });

    // Delete the conversation
    await this.db.conversation.delete({
      where: { id: conversationId },
    });
  }

  async addMessage(input: {
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
  }): Promise<void> {
    await this.db.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
      },
    });
    // Also update the conversation's updatedAt timestamp
    await this.updateActivity(input.conversationId);
  }

  generateTitle(firstMessage: string): string {
    if (!firstMessage || firstMessage.trim() === '') {
      return 'New Conversation';
    }

    // Clean and truncate the message
    const cleaned = firstMessage.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // If it's very short, use it as-is
    if (cleaned.length <= 50) {
      return cleaned;
    }

    // If it's longer, truncate and add ellipsis
    return cleaned.substring(0, 47) + '...';
  }

  async updateTitle(conversationId: string, title: string): Promise<ConversationWithMessages> {
    const conversation = await this.db.conversation.update({
      where: { id: conversationId },
      data: {
        title,
        updatedAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return this.transformConversation(conversation);
  }

  async validateAccess(conversationId: string, userId?: string): Promise<ConversationWithMessages> {
    const conversation = await this.getById(conversationId);

    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    // For single-user deployment, basic existence check is sufficient
    // In multi-user setup, add userId validation here
    if (userId) {
      // TODO: Add user ownership validation when multi-user support is added
    }

    return conversation;
  }

  async updateActivity(conversationId: string): Promise<void> {
    await this.db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  // Wrapper methods for router compatibility
  async createConversation(input?: CreateConversationInput): Promise<ConversationWithMessages> {
    return this.create(input);
  }

  async listConversations(): Promise<ConversationListItem[]> {
    return this.list();
  }

  async updateConversationTitle(
    conversationId: string,
    firstMessage: string,
  ): Promise<ConversationWithMessages> {
    const title = this.generateTitle(firstMessage);
    return this.updateTitle(conversationId, title);
  }

  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    await this.delete(conversationId);
    return { success: true };
  }

  private transformConversation(conversation: any): ConversationWithMessages {
    return {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      systemPrompt: conversation.systemPrompt,
      temperature: conversation.temperature,
      maxTokens: conversation.maxTokens,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tokens: msg.tokens,
        createdAt: msg.createdAt,
        parentId: msg.parentId,
      })),
    };
  }
}

/**
 * Demo mode implementation that uses in-memory storage
 */
export class DemoConversationService implements ConversationService {
  private conversations = new Map<string, ConversationWithMessages>();

  constructor() {
    // Initialize with sample conversation
    const sampleConversation: ConversationWithMessages = {
      id: 'demo-1',
      title: 'Welcome to the Chat App Demo!',
      model: 'demo-assistant-v1',
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 1000,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3600000),
      messages: [],
    };
    this.conversations.set('demo-1', sampleConversation);
  }

  async create(input: CreateConversationInput = {}): Promise<ConversationWithMessages> {
    const id = `demo-${Date.now()}`;
    const conversation: ConversationWithMessages = {
      id,
      title: input.title ?? null,
      model: input.model ?? 'demo-assistant-v1',
      systemPrompt: input.systemPrompt ?? 'You are a helpful AI assistant.',
      temperature: input.temperature ?? 0.7,
      maxTokens: input.maxTokens ?? 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };

    this.conversations.set(id, conversation);
    return conversation;
  }

  async getById(conversationId: string): Promise<ConversationWithMessages | null> {
    return this.conversations.get(conversationId) || null;
  }

  async list(): Promise<ConversationListItem[]> {
    return Array.from(this.conversations.values()).map((conv) => ({
      id: conv.id,
      title: conv.title || this.generateTitle(conv.messages[0]?.content || 'New Conversation'),
      model: conv.model,
      systemPrompt: conv.systemPrompt,
      temperature: conv.temperature,
      maxTokens: conv.maxTokens,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
      lastMessagePreview: conv.messages[0]?.content?.substring(0, 100),
    }));
  }

  async update(
    conversationId: string,
    input: UpdateConversationInput,
  ): Promise<ConversationWithMessages> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    const updated = {
      ...conversation,
      ...input,
      updatedAt: new Date(),
    };

    this.conversations.set(conversationId, updated);
    return updated;
  }

  async delete(conversationId: string): Promise<void> {
    if (!this.conversations.has(conversationId)) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }
    this.conversations.delete(conversationId);
  }

  generateTitle(firstMessage: string): string {
    if (!firstMessage || firstMessage.trim() === '') {
      return 'New Conversation';
    }

    const cleaned = firstMessage.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
    return cleaned.length <= 50 ? cleaned : cleaned.substring(0, 47) + '...';
  }

  async updateTitle(conversationId: string, title: string): Promise<ConversationWithMessages> {
    return this.update(conversationId, { title });
  }

  async validateAccess(conversationId: string, userId?: string): Promise<ConversationWithMessages> {
    const conversation = await this.getById(conversationId);
    if (!conversation) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
      });
    }
    return conversation;
  }

  async updateActivity(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      this.conversations.set(conversationId, conversation);
    }
  }

  // Wrapper methods for router compatibility
  async createConversation(input?: CreateConversationInput): Promise<ConversationWithMessages> {
    return this.create(input);
  }

  async listConversations(): Promise<ConversationListItem[]> {
    return this.list();
  }

  async updateConversationTitle(
    conversationId: string,
    firstMessage: string,
  ): Promise<ConversationWithMessages> {
    const title = this.generateTitle(firstMessage);
    return this.updateTitle(conversationId, title);
  }

  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    await this.delete(conversationId);
    return { success: true };
  }
}
