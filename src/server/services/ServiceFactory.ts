import { PrismaClient } from '@prisma/client';
import {
  ConversationService,
  DatabaseConversationService,
  DemoConversationService,
} from './conversation/ConversationService';
import {
  MessageService,
  DatabaseMessageService,
  DemoMessageService,
} from './message/MessageService';
import { ChatService, DatabaseChatService, DemoChatService } from './chat/ChatService';
import { createAssistant, type Assistant } from './assistant';
import { isServerSideDemo } from '../../utils/demo';

export interface ServiceContainer {
  conversationService: ConversationService;
  messageService: MessageService;
  chatService: ChatService;
  assistant: Assistant;
}

export interface ServiceFactoryOptions {
  db?: PrismaClient | null;
  forceDemo?: boolean;
  assistantConfig?: {
    apiKey?: string;
    siteName?: string;
  };
}

/**
 * Service factory for creating and managing service instances
 * Handles dependency injection and service lifecycle
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: ServiceContainer | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Create service container with all dependencies properly injected
   */
  createServices(options: ServiceFactoryOptions = {}): ServiceContainer {
    const { db, forceDemo = false, assistantConfig = {} } = options;

    // Determine if we should use demo mode
    const useDemo = forceDemo || isServerSideDemo() || !db;

    // Create assistant service
    const assistant = createAssistant(assistantConfig);

    let conversationService: ConversationService;
    let messageService: MessageService;
    let chatService: ChatService;

    if (useDemo) {
      // Create demo services
      conversationService = new DemoConversationService();
      messageService = new DemoMessageService();
      chatService = new DemoChatService();
    } else {
      // Create database services
      conversationService = new DatabaseConversationService(db!);
      messageService = new DatabaseMessageService(db!);
      chatService = new DatabaseChatService(conversationService, messageService, assistant);
    }

    return {
      conversationService,
      messageService,
      chatService,
      assistant,
    };
  }

  /**
   * Get or create cached service container
   * Useful for maintaining service instances across requests
   */
  getServices(options: ServiceFactoryOptions = {}): ServiceContainer {
    // For now, create new services each time to avoid stale state
    // In the future, we could implement caching with proper invalidation
    return this.createServices(options);
  }

  /**
   * Reset cached services (useful for testing)
   */
  reset(): void {
    this.services = null;
  }
}

/**
 * Convenience function to get service container
 */
export function createServiceContainer(options: ServiceFactoryOptions = {}): ServiceContainer {
  const factory = ServiceFactory.getInstance();
  return factory.createServices(options);
}

/**
 * Convenience functions for getting individual services
 */
export function createConversationService(
  options: ServiceFactoryOptions = {},
): ConversationService {
  const services = createServiceContainer(options);
  return services.conversationService;
}

export function createMessageService(options: ServiceFactoryOptions = {}): MessageService {
  const services = createServiceContainer(options);
  return services.messageService;
}

export function createChatService(options: ServiceFactoryOptions = {}): ChatService {
  const services = createServiceContainer(options);
  return services.chatService;
}

/**
 * Service factory for tRPC context
 * Creates services based on context information
 */
export function createServicesFromContext(ctx: {
  db: PrismaClient | null;
  user?: { sessionId?: string } | null;
}): ServiceContainer {
  const options: ServiceFactoryOptions = {
    db: ctx.db,
    forceDemo: !ctx.db,
    assistantConfig: {
      siteName: 'chat-app',
    },
  };

  return createServiceContainer(options);
}

/**
 * Type definitions for service injection
 */
export type ServiceInjection<T extends keyof ServiceContainer> = ServiceContainer[T];

/**
 * Service middleware for dependency injection
 */
export function withServices<T extends keyof ServiceContainer>(
  serviceNames: T[],
  handler: (services: Pick<ServiceContainer, T>) => Promise<any>,
) {
  return async (ctx: { db: PrismaClient | null; user?: any }) => {
    const allServices = createServicesFromContext(ctx);
    const selectedServices = serviceNames.reduce(
      (acc, name) => {
        acc[name] = allServices[name];
        return acc;
      },
      {} as Pick<ServiceContainer, T>,
    );

    return handler(selectedServices);
  };
}
