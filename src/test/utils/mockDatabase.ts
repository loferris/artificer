/**
 * Shared database mocking utilities for tests
 * 
 * This module provides reusable mock utilities to avoid duplication
 * across test files and ensure consistent mocking patterns.
 */

import { vi, type MockInstance } from 'vitest';
import type { PrismaClient } from '@prisma/client';

export interface MockPrismaClient {
  conversation: {
    create: MockInstance;
    findUnique: MockInstance;
    findMany: MockInstance;
    update: MockInstance;
    delete: MockInstance;
    count: MockInstance;
    deleteMany: MockInstance;
  };
  message: {
    create: MockInstance;
    findUnique: MockInstance;
    findMany: MockInstance;
    update: MockInstance;
    delete: MockInstance;
    deleteMany: MockInstance;
    groupBy: MockInstance;
  };
  $transaction: MockInstance;
  $connect: MockInstance;
  $disconnect: MockInstance;
  $queryRaw: MockInstance;
}

/**
 * Creates a comprehensive mock Prisma client with all commonly used methods
 */
export function createMockPrismaClient(): MockPrismaClient {
  return {
    conversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
  } as MockPrismaClient;
}

/**
 * Sets up standard transaction mock behavior
 * Supports both array-style and callback-style transactions
 */
export function setupTransactionMocks(mockClient: MockPrismaClient): void {
  // Handle array-style transactions: $transaction([query1, query2])
  mockClient.$transaction.mockImplementation((queries: any) => {
    if (Array.isArray(queries)) {
      return Promise.all(queries.map((query: any) => query));
    }
    // Handle callback-style transactions: $transaction(async (tx) => { ... })
    if (typeof queries === 'function') {
      return queries(mockClient);
    }
    return Promise.resolve();
  });
}

/**
 * Sets up advanced transaction mock behavior with realistic simulation
 * Use this for tests that need to verify transaction behavior, rollbacks, etc.
 */
export function setupAdvancedTransactionMocks(
  mockClient: MockPrismaClient, 
  options: { enableRollback?: boolean; enableIsolation?: boolean } = {}
): void {
  const { TransactionMocks } = require('./advancedMockTransaction');
  TransactionMocks.advanced(mockClient, options);
}

/**
 * Sets up connection mocks for database initialization tests
 */
export function setupConnectionMocks(mockClient: MockPrismaClient): void {
  mockClient.$connect.mockResolvedValue(undefined);
  mockClient.$disconnect.mockResolvedValue(undefined);
  mockClient.$queryRaw.mockResolvedValue([{ '1': 1 }]); // Health check query
}

/**
 * Complete test setup for database service tests
 * Returns a properly configured mock client with standard behavior
 */
export function setupDatabaseServiceMocks(): MockPrismaClient {
  const mockClient = createMockPrismaClient();
  setupTransactionMocks(mockClient);
  setupConnectionMocks(mockClient);
  return mockClient;
}

/**
 * Resets all mocks to their initial state
 * Call this in beforeEach to ensure test isolation
 */
export function resetDatabaseMocks(mockClient: MockPrismaClient): void {
  vi.clearAllMocks();
  
  // Re-setup transaction behavior after clearing
  setupTransactionMocks(mockClient);
  setupConnectionMocks(mockClient);
}

/**
 * Creates mock service factory with customizable service implementations
 */
export interface MockServiceContainer {
  messageService: any;
  conversationService: any;
  chatService: any;
  assistant: any;
}

export function createMockServiceContainer(overrides: Partial<MockServiceContainer> = {}): MockServiceContainer {
  return {
    messageService: {
      createMessage: vi.fn(),
      getMessagesByConversation: vi.fn(),
      updateMessage: vi.fn(),
      deleteMessage: vi.fn(),
      ...overrides.messageService,
    },
    conversationService: {
      createConversation: vi.fn(),
      getConversations: vi.fn(),
      getConversationById: vi.fn(),
      updateConversation: vi.fn(),
      deleteConversation: vi.fn(),
      ...overrides.conversationService,
    },
    chatService: {
      sendMessage: vi.fn(),
      streamMessage: vi.fn(),
      ...overrides.chatService,
    },
    assistant: {
      getResponse: vi.fn(),
      streamResponse: vi.fn(),
      ...overrides.assistant,
    },
  };
}

/**
 * Sets up service factory mocking for router tests
 * Usage: setupServiceFactoryMocks(mockServices) in beforeEach
 */
export async function setupServiceFactoryMocks(mockServices: MockServiceContainer): Promise<void> {
  const { createServicesFromContext } = await import('../../server/services/ServiceFactory');
  (createServicesFromContext as any).mockReturnValue(mockServices);
}

/**
 * Common test patterns for different testing scenarios
 */
export const TestScenarios = {
  /**
   * Sets up mocks for unit testing a single service
   */
  serviceTest: <T>(ServiceClass: new (client: any) => T, mockClient?: MockPrismaClient) => {
    const client = mockClient || setupDatabaseServiceMocks();
    const service = new ServiceClass(client as any);
    
    return { service, mockClient: client };
  },

  /**
   * Sets up mocks for API route testing
   */
  apiTest: (mockServices?: Partial<MockServiceContainer>) => {
    const services = createMockServiceContainer(mockServices);
    
    beforeEach(async () => {
      await setupServiceFactoryMocks(services);
    });
    
    return { mockServices: services };
  },

  /**
   * Sets up mocks for integration testing with real service instances
   */
  integrationTest: (mockClient?: MockPrismaClient) => {
    const client = mockClient || setupDatabaseServiceMocks();
    
    return { mockClient: client };
  },
};

/**
 * Utility for creating consistent mock responses
 */
export const MockResponses = {
  success: <T>(data: T) => Promise.resolve(data),
  error: (message: string) => Promise.reject(new Error(message)),
  empty: () => Promise.resolve([]),
  notFound: () => Promise.resolve(null),
};

/**
 * Database operation mock helpers
 */
export const DatabaseMocks = {
  /**
   * Mock a successful create operation
   */
  mockCreate: (mockClient: MockPrismaClient, entity: 'conversation' | 'message', returnValue: any) => {
    mockClient[entity].create.mockResolvedValue(returnValue);
  },

  /**
   * Mock a successful find operation
   */
  mockFind: (mockClient: MockPrismaClient, entity: 'conversation' | 'message', returnValue: any) => {
    mockClient[entity].findMany.mockResolvedValue(returnValue);
    mockClient[entity].findUnique.mockResolvedValue(Array.isArray(returnValue) ? returnValue[0] : returnValue);
  },

  /**
   * Mock a not found scenario
   */
  mockNotFound: (mockClient: MockPrismaClient, entity: 'conversation' | 'message') => {
    mockClient[entity].findUnique.mockResolvedValue(null);
    mockClient[entity].findMany.mockResolvedValue([]);
  },

  /**
   * Mock an operation failure
   */
  mockError: (mockClient: MockPrismaClient, entity: 'conversation' | 'message', operation: string, error: string) => {
    (mockClient[entity] as any)[operation].mockRejectedValue(new Error(error));
  },

  /**
   * Mock standard CRUD scenarios with realistic data
   * Integrates with mock data factories for consistent test data
   */
  mockCrudScenario: (
    mockClient: MockPrismaClient, 
    entity: 'conversation' | 'message',
    scenario: 'success' | 'notFound' | 'error',
    data?: any
  ) => {
    switch (scenario) {
      case 'success':
        if (data) {
          DatabaseMocks.mockCreate(mockClient, entity, data);
          DatabaseMocks.mockFind(mockClient, entity, data);
        }
        break;
      case 'notFound':
        DatabaseMocks.mockNotFound(mockClient, entity);
        break;
      case 'error':
        DatabaseMocks.mockError(mockClient, entity, 'create', 'Database operation failed');
        DatabaseMocks.mockError(mockClient, entity, 'findUnique', 'Database operation failed');
        break;
    }
  },
};