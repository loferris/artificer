// src/server/services/chat/ChatService.ts

import { logger } from '../../utils/logger';
import { TRPCError } from '@trpc/server';
import type { ConversationService } from '../conversation/ConversationService';
import type { MessageService } from '../message/MessageService';
import type { Assistant, AssistantResponse } from '../assistant';
import { generateDemoResponse } from '../../../utils/staticDemo';

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

// New streaming interfaces
export interface ChatStreamChunk {
  content: string;
  finished: boolean;
  error?: string;
  metadata?: {
    tokenCount?: number;
    model?: string;
    cost?: number;
    messageId?: string;
  };
}

export interface ChatStreamInput {
  content: string;
  conversationId: string;
  signal?: AbortSignal;
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
   * Stream a message response from AI
   * Returns an async iterable of chunks as they arrive
   */
  createMessageStream(input: ChatStreamInput, userId?: string): AsyncIterable<ChatStreamChunk>;

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

  // Existing sendMessage method remains the same
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

      // Check if this is the first user message and generate title
      const messageCount = await this.messageService.countByConversation(conversationId);
      let conversationTitle: string | undefined;

      if (messageCount === 2) {
        // First exchange (user + assistant)
        conversationTitle = this.conversationService.generateTitle(content);
        await this.conversationService.updateTitle(conversationId, conversationTitle);
      }

      // Update conversation activity
      await this.conversationService.updateActivity(conversationId);

      return {
        userMessage: this.formatChatMessage(userMessage),
        assistantMessage: this.formatChatMessage(assistantMessage),
        conversationTitle,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Request was cancelled') {
        throw new TRPCError({
          code: 'CLIENT_CLOSED_REQUEST',
          message: 'Request was cancelled',
        });
      }
      throw error;
    }
  }

  // NEW: Streaming method
  async *createMessageStream(
    input: ChatStreamInput,
    userId?: string,
  ): AsyncIterable<ChatStreamChunk> {
    const { content, conversationId, signal } = input;

    try {
      // Check if cancelled before starting
      if (signal?.aborted) {
        yield { content: '', finished: true, error: 'Request was cancelled' };
        return;
      }

      // Validate message content
      this.validateMessage(content);

      // Validate conversation access
      const conversation = await this.conversationService.validateAccess(conversationId, userId);

      // Create user message first
      const userMessage = await this.messageService.create({
        conversationId,
        role: 'user',
        content,
      });

      // Get conversation history for AI context
      const conversationHistory = await this.messageService.getConversationHistory(conversationId);

      // Check if cancelled before AI call
      if (signal?.aborted) {
        yield { content: '', finished: true, error: 'Request was cancelled' };
        return;
      }

      // Check if assistant supports streaming
      if ('createResponseStream' in this.assistant) {
        // Use streaming assistant
        let fullResponse = '';
        let totalTokens = 0;
        let model = 'unknown';
        let totalCost = 0;

        if (this.assistant.createResponseStream) {
          const stream = this.assistant.createResponseStream(content, conversationHistory, {
            signal,
          });

          for await (const chunk of stream) {
            // Check for cancellation first
            if (signal?.aborted) {
              throw new Error('Request was cancelled');
            }

            // Check if the assistant's stream is done
            if (chunk.finished) {
              model = chunk.model || model; // Grab final metadata
              break; // Exit the service's loop over the assistant's chunks
            }

            // If not finished, process the content
            fullResponse += chunk.content;
            totalTokens += chunk.tokenCount || 0;
            model = chunk.model || model;
            totalCost += chunk.cost || 0;

            // Yield the chunk to the client
            yield {
              content: chunk.content,
              finished: false,
              metadata: {
                tokenCount: chunk.tokenCount,
                model: chunk.model,
                cost: chunk.cost,
              },
            };
          }

          // Save the complete assistant message to database
          const assistantMessage = await this.messageService.create({
            conversationId,
            role: 'assistant',
            content: fullResponse,
          });

          await this._updateConversationMetadata(conversationId, content);

          // Final chunk with completion metadata
          yield {
            content: '',
            finished: true,
            metadata: {
              tokenCount: totalTokens,
              model,
              cost: totalCost,
              messageId: assistantMessage.id,
            },
          };
        }
      } else {
        // Fallback: simulate streaming for non-streaming assistants
        const aiResponse = await this.assistant.getResponse(content, conversationHistory, {
          signal,
        });
        const response = typeof aiResponse === 'string' ? aiResponse : aiResponse.response;
        const model = typeof aiResponse === 'string' ? 'unknown' : aiResponse.model;
        const cost = typeof aiResponse === 'string' ? 0 : aiResponse.cost;

        // Create assistant message
        const assistantMessage = await this.messageService.create({
          conversationId,
          role: 'assistant',
          content: response,
        });

        // Simulate streaming by chunking the response
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
          if (signal?.aborted) {
            yield { content: '', finished: true, error: 'Request was cancelled' };
            return;
          }

          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
          yield {
            content: chunk,
            finished: false,
            metadata: { model },
          };

          // Small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        await this._updateConversationMetadata(conversationId, content);

        // Final completion chunk
        yield {
          content: '',
          finished: true,
          metadata: {
            tokenCount: assistantMessage.tokens || undefined,
            model,
            cost,
            messageId: assistantMessage.id,
          },
        };
      }
    } catch (error) {
      logger.error('Chat stream error', error as Error, { conversationId, userId });

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message === 'Request was cancelled') {
          errorMessage = 'Request was cancelled';
        } else {
          errorMessage = error.message;
        }
      }

      yield {
        content: '',
        finished: true,
        error: errorMessage,
      };
    }
  }

  // Existing methods remain the same...
  async getChatMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
    const conversation = await this.conversationService.validateAccess(conversationId, userId);
    const messages = await this.messageService.getByConversation(conversationId);
    return messages.map((msg) => this.formatChatMessage(msg));
  }

  validateMessage(content: string): void {
    if (!content || content.trim().length === 0) {
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

  private async _updateConversationMetadata(
    conversationId: string,
    userContent: string,
  ): Promise<void> {
    // Check if this is the first exchange and generate title
    const messageCount = await this.messageService.countByConversation(conversationId);
    if (messageCount === 2) {
      const conversationTitle = this.conversationService.generateTitle(userContent);
      await this.conversationService.updateTitle(conversationId, conversationTitle);
    }

    // Update conversation activity
    await this.conversationService.updateActivity(conversationId);
  }

  private formatChatMessage(message: any): ChatMessage {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.createdAt,
      model: message.model,
      cost: message.cost,
      tokens: message.tokens,
    };
  }
}

// Demo service also gets streaming support
export class DemoChatService implements ChatService {
  private conversations = new Map<string, ChatMessage[]>();

  constructor(
    private conversationService?: ConversationService,
    private messageService?: MessageService,
  ) {}

  // Existing sendMessage implementation...
  async sendMessage(input: SendMessageInput, userId?: string): Promise<SendMessageResult> {
    // Your existing demo implementation
    const { content, conversationId } = input;

    this.validateMessage(content);

    const userMessage: ChatMessage = {
      id: `demo-msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate a smart demo response
    const demoResponse = generateDemoResponse(content);
    
    const assistantMessage: ChatMessage = {
      id: `demo-msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: demoResponse.content,
      timestamp: new Date(),
      model: demoResponse.model || 'demo-assistant-v1',
      cost: demoResponse.cost || 0.001,
      tokens: Math.ceil(demoResponse.content.length / 4),
    };

    // Store messages using messageService if available
    if (this.messageService) {
      // Store user message
      await this.messageService.create({
        conversationId,
        role: 'user',
        content: userMessage.content,
      });

      // Store assistant message
      await this.messageService.create({
        conversationId,
        role: 'assistant', 
        content: assistantMessage.content,
      });
    } else {
      // Fallback to in-memory storage
      const messages = this.conversations.get(conversationId) || [];
      messages.push(userMessage, assistantMessage);
      this.conversations.set(conversationId, messages);
    }

    return { userMessage, assistantMessage };
  }

  // NEW: Demo streaming implementation
  async *createMessageStream(
    input: ChatStreamInput,
    userId?: string,
  ): AsyncIterable<ChatStreamChunk> {
    const { content, conversationId, signal } = input;

    try {
      this.validateMessage(content);

      // Create demo user message
      const userMessage: ChatMessage = {
        id: `demo-msg-${Date.now()}-user`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      // Generate smart demo streaming response
      const demoResponse = generateDemoResponse(content);
      const response = demoResponse.content;
      const words = response.split(' ');

      let fullResponse = '';

      for (let i = 0; i < words.length; i++) {
        if (signal?.aborted) {
          yield { content: '', finished: true, error: 'Request was cancelled' };
          return;
        }

        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        fullResponse += chunk;

        yield {
          content: chunk,
          finished: false,
          metadata: {
            model: demoResponse.model || 'demo-assistant-v1',
            tokenCount: 1,
          },
        };

        // Simulate realistic typing delay
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Create demo assistant message
      const assistantMessage: ChatMessage = {
        id: `demo-msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        model: demoResponse.model || 'demo-assistant-v1',
        cost: demoResponse.cost || 0.001,
        tokens: words.length,
      };

      // Store messages using messageService if available
      if (this.messageService) {
        // Store user message
        await this.messageService.create({
          conversationId,
          role: 'user',
          content: userMessage.content,
        });

        // Store assistant message
        await this.messageService.create({
          conversationId,
          role: 'assistant', 
          content: assistantMessage.content,
        });
      } else {
        // Fallback to in-memory storage
        const messages = this.conversations.get(conversationId) || [];
        messages.push(userMessage, assistantMessage);
        this.conversations.set(conversationId, messages);
      }

      // Final completion chunk
      yield {
        content: '',
        finished: true,
        metadata: {
          tokenCount: words.length,
          model: demoResponse.model || 'demo-assistant-v1',
          cost: demoResponse.cost || 0.001,
          messageId: assistantMessage.id,
        },
      };
    } catch (error) {
      logger.error('Demo stream error:', error);
      yield {
        content: '',
        finished: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getChatMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
    return this.conversations.get(conversationId) || [];
  }

  validateMessage(content: string): void {
    if (!content || content.trim().length === 0) {
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
