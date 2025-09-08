import { TRPCError } from '@trpc/server';
import type { ConversationService } from '../conversation/ConversationService';
import type { MessageService } from '../message/MessageService';
import type { Assistant, AssistantResponse } from '../assistant';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  cost?: number;
  tokens?: number;
}

export interface SendMessageInput {
  content: string;
  conversationId: string;
  signal?: AbortSignal;
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  conversationTitle?: string;
}

export interface ChatService {
  /**
   * Send a message and get AI response
   * Handles the complete chat flow including:
   * - Validating conversation access
   * - Creating user message
   * - Getting AI response
   * - Creating assistant message
   * - Auto-generating title for first message
   * - Updating conversation activity
   */
  sendMessage(input: SendMessageInput, userId?: string): Promise<SendMessageResult>;

  /**
   * Get formatted chat messages for a conversation
   */
  getChatMessages(conversationId: string, userId?: string): Promise<ChatMessage[]>;

  /**
   * Validate that a user message is acceptable
   */
  validateMessage(content: string): void;
}

export class DatabaseChatService implements ChatService {
  constructor(
    private conversationService: ConversationService,
    private messageService: MessageService,
    private assistant: Assistant,
  ) {}

  async sendMessage(input: SendMessageInput, userId?: string): Promise<SendMessageResult> {
    const { content, conversationId, signal } = input;

    try {
      // Check if cancelled before starting
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      // Validate message content
      this.validateMessage(content);

      // Validate conversation access
      const conversation = await this.conversationService.validateAccess(conversationId, userId);

      // Get conversation history for AI context
      const conversationHistory = await this.messageService.getConversationHistory(conversationId);

      // Check if cancelled before AI call
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      // Get AI response with abort signal
      const aiResponse = await this.assistant.getResponse(content, conversationHistory, { signal });
      const response = typeof aiResponse === 'string' ? aiResponse : aiResponse.response;
      const model = typeof aiResponse === 'string' ? 'unknown' : aiResponse.model;
      const cost = typeof aiResponse === 'string' ? 0 : aiResponse.cost;

      // Check if cancelled after getting response
      if (signal?.aborted) {
        throw new Error('Request was cancelled');
      }

      if (!response || response.trim() === '') {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Assistant response is empty',
        });
      }

      // Create messages and handle title generation in a coordinated way
      const result = await this.createMessagesWithTitleHandling(
        conversationId,
        content,
        response,
        model,
        cost,
        conversationHistory.length === 0, // Is this the first user message?
      );

      return result;
    } catch (error) {
      // Re-throw tRPC errors as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Log and transform other errors
      console.error('Error in sendMessage:', error);
      throw this.transformError(error);
    }
  }

  async getChatMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
    try {
      // Validate conversation access
      await this.conversationService.validateAccess(conversationId, userId);

      // Get messages
      const messages = await this.messageService.getByConversation(conversationId);

      // Transform to chat format
      return messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
        model: msg.model,
        cost: msg.cost,
        tokens: msg.tokens || undefined,
      }));
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error getting chat messages:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve messages',
        cause: error,
      });
    }
  }

  validateMessage(content: string): void {
    if (!content || content.trim() === '') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message content cannot be empty',
      });
    }

    if (content.length > 10000) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message content too long (max 10,000 characters)',
      });
    }

    // Additional validation can be added here
    // - Profanity filtering
    // - Rate limiting per content
    // - Content policy checks
  }

  private async createMessagesWithTitleHandling(
    conversationId: string,
    userContent: string,
    assistantContent: string,
    model: string,
    cost: number,
    isFirstMessage: boolean,
  ): Promise<SendMessageResult> {
    // Create user message
    const userMessage = await this.messageService.create({
      conversationId,
      role: 'user',
      content: userContent,
    });

    // Create assistant message
    const assistantMessage = await this.messageService.create({
      conversationId,
      role: 'assistant',
      content: assistantContent,
    });

    let conversationTitle: string | undefined;

    // Handle title generation and conversation updates
    if (isFirstMessage) {
      // Auto-generate title from first user message
      const generatedTitle = this.conversationService.generateTitle(userContent);
      await this.conversationService.updateTitle(conversationId, generatedTitle);
      conversationTitle = generatedTitle;
    } else {
      // Just update activity timestamp
      await this.conversationService.touchActivity(conversationId);
    }

    return {
      userMessage: {
        id: userMessage.id,
        role: 'user',
        content: userMessage.content,
        timestamp: userMessage.createdAt,
        tokens: userMessage.tokens || undefined,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: assistantMessage.createdAt,
        model,
        cost,
        tokens: assistantMessage.tokens || undefined,
      },
      conversationTitle,
    };
  }

  private transformError(error: unknown): TRPCError {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Network/API related errors
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        return new TRPCError({
          code: 'GATEWAY_TIMEOUT',
          message: 'The AI service is taking too long to respond. Please try again in a moment.',
          cause: error,
        });
      }

      if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
        return new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please wait a moment before trying again.',
          cause: error,
        });
      }

      if (errorMessage.includes('unauthorized') || errorMessage.includes('api key')) {
        return new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'AI service configuration issue. Please check your settings.',
          cause: error,
        });
      }

      if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
        return new TRPCError({
          code: 'PAYMENT_REQUIRED',
          message: 'AI service quota exceeded. Please check your account or try again later.',
          cause: error,
        });
      }

      if (errorMessage.includes('database') || errorMessage.includes('connection')) {
        return new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection issue. Please try again in a moment.',
          cause: error,
        });
      }

      if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        return new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid request. Please check your message and try again.',
          cause: error,
        });
      }
    }

    // Default error
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong. Please try again.',
      cause: error,
    });
  }
}

/**
 * Demo mode implementation
 */
export class DemoChatService implements ChatService {
  constructor(
    private conversationService: ConversationService,
    private messageService: MessageService,
    private assistant: Assistant,
  ) {}

  async sendMessage(input: SendMessageInput, userId?: string): Promise<SendMessageResult> {
    const { content, conversationId, signal } = input;

    // Check if cancelled before starting
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }

    // Validate message content
    this.validateMessage(content);

    // Validate conversation exists (demo mode)
    await this.conversationService.validateAccess(conversationId, userId);

    // Get conversation history
    const conversationHistory = await this.messageService.getConversationHistory(conversationId);

    // Check if cancelled before AI call
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }

    // Get AI response (will be demo response) with abort signal
    const aiResponse = await this.assistant.getResponse(content, conversationHistory, { signal });
    const response = typeof aiResponse === 'string' ? aiResponse : aiResponse.response;
    const model = typeof aiResponse === 'string' ? 'demo-assistant-v1' : aiResponse.model;
    const cost = typeof aiResponse === 'string' ? 0.001 : aiResponse.cost;

    // Check if cancelled after getting response
    if (signal?.aborted) {
      throw new Error('Request was cancelled');
    }

    // Create user message
    const userMessage = await this.messageService.create({
      conversationId,
      role: 'user',
      content,
    });

    // Create assistant message
    const assistantMessage = await this.messageService.create({
      conversationId,
      role: 'assistant',
      content: response,
    });

    let conversationTitle: string | undefined;

    // Handle title generation for first message
    if (conversationHistory.length === 0) {
      const generatedTitle = this.conversationService.generateTitle(content);
      await this.conversationService.updateTitle(conversationId, generatedTitle);
      conversationTitle = generatedTitle;
    }

    return {
      userMessage: {
        id: userMessage.id,
        role: 'user',
        content: userMessage.content,
        timestamp: userMessage.createdAt,
        tokens: userMessage.tokens || undefined,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: assistantMessage.createdAt,
        model,
        cost,
        tokens: assistantMessage.tokens || undefined,
      },
      conversationTitle,
    };
  }

  async getChatMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
    // Validate access
    await this.conversationService.validateAccess(conversationId, userId);

    // Get messages
    const messages = await this.messageService.getByConversation(conversationId);

    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt,
      model: msg.model,
      cost: msg.cost,
      tokens: msg.tokens || undefined,
    }));
  }

  validateMessage(content: string): void {
    if (!content || content.trim() === '') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message content cannot be empty',
      });
    }

    if (content.length > 10000) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Message content too long (max 10,000 characters)',
      });
    }
  }
}
