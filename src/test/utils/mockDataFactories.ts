/**
 * Mock data factories for generating realistic test data
 * 
 * These factories create dynamic, customizable mock data for testing
 * while maintaining realistic relationships and data structures.
 */

import type { Conversation, Message } from '@prisma/client';

type Role = 'user' | 'assistant';

/**
 * Counter for generating unique IDs in tests
 */
let idCounter = 1;
const generateId = (prefix: string) => `${prefix}_test_${idCounter++}`;

/**
 * Factory for creating mock messages
 */
export class MessageFactory {
  private static defaults = {
    role: 'user' as Role,
    content: 'Test message content',
    tokens: 5,
    conversationId: 'conv_default',
    parentId: null,
    createdAt: new Date(),
  };

  /**
   * Creates a single mock message with optional overrides
   */
  static create(overrides: Partial<Message> = {}): Message {
    return {
      id: generateId('msg'),
      ...this.defaults,
      createdAt: new Date(),
      ...overrides,
    } as Message;
  }

  /**
   * Creates multiple mock messages
   */
  static createMany(count: number, baseOverrides: Partial<Message> = {}): Message[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({
        ...baseOverrides,
        content: `Test message ${index + 1}`,
        createdAt: new Date(Date.now() + index * 1000), // Sequential timestamps
      })
    );
  }

  /**
   * Creates a conversation thread (user message + assistant response)
   */
  static createThread(
    conversationId: string, 
    userContent = 'Hello', 
    assistantContent = 'Hi there!'
  ): Message[] {
    const userMessage = this.create({
      conversationId,
      role: 'user',
      content: userContent,
      tokens: this.estimateTokens(userContent),
    });

    const assistantMessage = this.create({
      conversationId,
      role: 'assistant', 
      content: assistantContent,
      tokens: this.estimateTokens(assistantContent),
      createdAt: new Date(userMessage.createdAt.getTime() + 1000),
    });

    return [userMessage, assistantMessage];
  }

  /**
   * Creates a user message
   */
  static user(content: string, overrides: Partial<Message> = {}): Message {
    return this.create({
      role: 'user',
      content,
      tokens: this.estimateTokens(content),
      ...overrides,
    });
  }

  /**
   * Creates an assistant message
   */
  static assistant(content: string, overrides: Partial<Message> = {}): Message {
    return this.create({
      role: 'assistant',
      content,
      tokens: this.estimateTokens(content),
      ...overrides,
    });
  }

  /**
   * Simple token estimation for testing
   */
  private static estimateTokens(content: string): number {
    return Math.max(1, Math.ceil(content.split(/\s+/).length * 0.75));
  }
}

/**
 * Factory for creating mock conversations
 */
export class ConversationFactory {
  private static defaults = {
    title: null,
    model: 'deepseek-chat',
    systemPrompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
    maxTokens: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * Creates a single mock conversation with optional overrides
   */
  static create(overrides: Partial<Conversation & { messages?: Message[] }> = {}): Conversation & { messages?: Message[] } {
    const conversation = {
      id: generateId('conv'),
      ...this.defaults,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Conversation & { messages?: Message[] };

    // If messages are not provided, create a default thread
    if (!overrides.messages && !overrides.hasOwnProperty('messages')) {
      conversation.messages = MessageFactory.createThread(conversation.id);
    }

    return conversation;
  }

  /**
   * Creates multiple mock conversations
   */
  static createMany(count: number, baseOverrides: Partial<Conversation> = {}): Conversation[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({
        ...baseOverrides,
        title: `Test Conversation ${index + 1}`,
        createdAt: new Date(Date.now() - (count - index) * 3600000), // Spread over hours
      }) as Conversation
    );
  }

  /**
   * Creates a conversation with specific scenario
   */
  static withScenario(scenario: ConversationScenario, overrides: Partial<Conversation> = {}): Conversation & { messages?: Message[] } {
    const scenarios = {
      empty: {
        title: 'Empty Conversation',
        messages: [],
      },
      simple: {
        title: 'Simple Chat',
        messages: MessageFactory.createThread(
          generateId('conv'),
          'Hello there',
          'Hello! How can I help you today?'
        ),
      },
      complex: {
        title: 'Complex Discussion',
        messages: [
          ...MessageFactory.createThread(
            generateId('conv'),
            'Can you help me with coding?',
            'Of course! What programming language are you working with?'
          ),
          MessageFactory.user('I\'m working with TypeScript'),
          MessageFactory.assistant('Great choice! TypeScript adds excellent type safety. What specific help do you need?'),
        ],
      },
      longHistory: {
        title: 'Long Conversation',
        messages: MessageFactory.createMany(20),
      },
    };

    const scenarioData = scenarios[scenario];
    const conversation = this.create({ ...scenarioData, ...overrides });
    
    // Update conversation ID in messages
    if (conversation.messages) {
      conversation.messages = conversation.messages.map(msg => ({
        ...msg,
        conversationId: conversation.id,
      }));
    }

    return conversation;
  }

  /**
   * Creates a conversation with specific model
   */
  static withModel(model: string, overrides: Partial<Conversation> = {}): Conversation {
    return this.create({
      model,
      title: `${model} Conversation`,
      ...overrides,
    }) as Conversation;
  }
}

export type ConversationScenario = 'empty' | 'simple' | 'complex' | 'longHistory';

/**
 * Factory for creating mock usage statistics
 */
export class UsageStatsFactory {
  static create(overrides: any = {}) {
    return {
      conversationCount: 5,
      messageCount: 25,
      totalTokens: 1250,
      totalCost: 0.05,
      ...overrides,
    };
  }

  static empty() {
    return this.create({
      conversationCount: 0,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
    });
  }

  static heavy() {
    return this.create({
      conversationCount: 100,
      messageCount: 2500,
      totalTokens: 125000,
      totalCost: 5.75,
    });
  }
}

/**
 * Preset data scenarios for common testing patterns
 */
export class DataScenarios {
  /**
   * Empty state - no conversations or messages
   */
  static empty() {
    return {
      conversations: [],
      messages: [],
      usageStats: UsageStatsFactory.empty(),
    };
  }

  /**
   * Single conversation scenario
   */
  static singleConversation() {
    const conversation = ConversationFactory.withScenario('simple');
    return {
      conversations: [conversation],
      messages: conversation.messages || [],
      usageStats: UsageStatsFactory.create({
        conversationCount: 1,
        messageCount: conversation.messages?.length || 0,
      }),
    };
  }

  /**
   * Multiple conversations scenario
   */
  static multipleConversations(count = 3) {
    const conversations = ConversationFactory.createMany(count);
    const allMessages = conversations.flatMap(conv => 
      MessageFactory.createThread(conv.id)
    );

    return {
      conversations,
      messages: allMessages,
      usageStats: UsageStatsFactory.create({
        conversationCount: count,
        messageCount: allMessages.length,
      }),
    };
  }

  /**
   * Complex scenario with mixed conversation types
   */
  static mixed() {
    const conversations = [
      ConversationFactory.withScenario('empty'),
      ConversationFactory.withScenario('simple'), 
      ConversationFactory.withScenario('complex'),
    ];

    const allMessages = conversations.flatMap(conv => conv.messages || []);

    return {
      conversations: conversations.map(({ messages, ...conv }) => conv),
      messages: allMessages,
      usageStats: UsageStatsFactory.create({
        conversationCount: conversations.length,
        messageCount: allMessages.length,
      }),
    };
  }
}

/**
 * Utility functions for test data manipulation
 */
export class TestDataUtils {
  /**
   * Resets the ID counter (useful in beforeEach)
   */
  static resetIdCounter(): void {
    idCounter = 1;
  }

  /**
   * Creates a realistic timestamp range
   */
  static createTimeRange(hoursAgo: number): Date {
    return new Date(Date.now() - hoursAgo * 3600000);
  }

  /**
   * Validates mock data structure matches expected schema
   */
  static validateMessage(message: any): message is Message {
    return (
      typeof message.id === 'string' &&
      ['user', 'assistant'].includes(message.role) &&
      typeof message.content === 'string' &&
      typeof message.tokens === 'number' &&
      message.createdAt instanceof Date
    );
  }

  static validateConversation(conversation: any): conversation is Conversation {
    return (
      typeof conversation.id === 'string' &&
      typeof conversation.model === 'string' &&
      conversation.createdAt instanceof Date
    );
  }
}

/**
 * Builder pattern for complex test scenarios
 */
export class TestDataBuilder {
  private conversations: Conversation[] = [];
  private messages: Message[] = [];

  conversation(options: Partial<Conversation> = {}): this {
    const conv = ConversationFactory.create(options) as Conversation;
    this.conversations.push(conv);
    return this;
  }

  withMessages(count: number, conversationId?: string): this {
    const targetId = conversationId || this.conversations[this.conversations.length - 1]?.id;
    if (!targetId) throw new Error('No conversation ID available for messages');

    const messages = MessageFactory.createMany(count, { conversationId: targetId });
    this.messages.push(...messages);
    return this;
  }

  build() {
    return {
      conversations: this.conversations,
      messages: this.messages,
      usageStats: UsageStatsFactory.create({
        conversationCount: this.conversations.length,
        messageCount: this.messages.length,
      }),
    };
  }
}

// Export convenience functions
export const createMessage = MessageFactory.create.bind(MessageFactory);
export const createConversation = ConversationFactory.create.bind(ConversationFactory);
export const createMessages = MessageFactory.createMany.bind(MessageFactory);
export const createConversations = ConversationFactory.createMany.bind(ConversationFactory);