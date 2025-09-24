/**
 * Advanced transaction mocking with realistic behavior simulation
 * 
 * This module provides sophisticated transaction mocking that better
 * simulates real Prisma transaction behavior including rollback scenarios,
 * isolation, and error handling.
 */

import { vi, type MockInstance } from 'vitest';
import type { MockPrismaClient } from './mockDatabase';

export interface TransactionError extends Error {
  code?: string;
  meta?: any;
}

export interface TransactionOptions {
  /**
   * Simulate transaction rollback on error
   */
  enableRollback?: boolean;
  
  /**
   * Simulate transaction isolation (operations don't affect outer scope until commit)
   */
  enableIsolation?: boolean;
  
  /**
   * Maximum time before transaction timeout (ms)
   */
  maxTimeout?: number;
  
  /**
   * Simulate deadlock detection
   */
  enableDeadlockDetection?: boolean;
}

/**
 * Transaction state tracking for realistic behavior simulation
 */
class TransactionState {
  private operations: Array<{ operation: string; args: any; result: any }> = [];
  private committed = false;
  private rolledBack = false;
  private startTime = Date.now();

  addOperation(operation: string, args: any, result: any): void {
    this.operations.push({ operation, args, result });
  }

  commit(): void {
    this.committed = true;
  }

  rollback(): void {
    this.rolledBack = true;
  }

  isCommitted(): boolean {
    return this.committed;
  }

  isRolledBack(): boolean {
    return this.rolledBack;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  getOperations() {
    return this.operations;
  }
}

/**
 * Advanced transaction mock that simulates realistic Prisma behavior
 */
export class AdvancedTransactionMock {
  private static transactionCount = 0;
  private options: TransactionOptions;
  private activeTransactions = new Map<string, TransactionState>();

  constructor(options: TransactionOptions = {}) {
    this.options = {
      enableRollback: true,
      enableIsolation: false,
      maxTimeout: 30000,
      enableDeadlockDetection: false,
      ...options,
    };
  }

  /**
   * Creates an advanced transaction mock implementation
   */
  createTransactionMock(mockClient: MockPrismaClient): MockInstance {
    return mockClient.$transaction.mockImplementation(async (queriesOrCallback: any, options?: any) => {
      const transactionId = `tx_${++AdvancedTransactionMock.transactionCount}`;
      const transactionState = new TransactionState();
      this.activeTransactions.set(transactionId, transactionState);

      try {
        // Handle timeout
        if (this.options.maxTimeout) {
          setTimeout(() => {
            if (!transactionState.isCommitted() && !transactionState.isRolledBack()) {
              transactionState.rollback();
              throw new Error('Transaction timeout');
            }
          }, this.options.maxTimeout);
        }

        let result: any;

        if (Array.isArray(queriesOrCallback)) {
          // Array-style transaction: $transaction([query1, query2])
          result = await this.handleArrayTransaction(queriesOrCallback, transactionState);
        } else if (typeof queriesOrCallback === 'function') {
          // Callback-style transaction: $transaction(async (tx) => { ... })
          result = await this.handleCallbackTransaction(
            queriesOrCallback, 
            mockClient, 
            transactionState
          );
        } else {
          throw new Error('Invalid transaction input');
        }

        // Simulate successful commit
        transactionState.commit();
        return result;

      } catch (error: any) {
        // Simulate rollback on error
        if (this.options.enableRollback) {
          transactionState.rollback();
          
          // Enhance error with transaction context
          const enhancedError = new Error(`Transaction failed: ${error.message}`) as TransactionError;
          enhancedError.code = 'P2034'; // Prisma transaction conflict code
          enhancedError.meta = {
            transactionId,
            operations: transactionState.getOperations(),
            duration: transactionState.getDuration(),
          };
          
          throw enhancedError;
        }
        
        throw error;
      } finally {
        this.activeTransactions.delete(transactionId);
      }
    });
  }

  /**
   * Handles array-style transactions with parallel execution simulation
   */
  private async handleArrayTransaction(
    queries: any[], 
    transactionState: TransactionState
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      try {
        // Simulate the query execution
        const result = await this.executeQuery(query, `batch_${i}`);
        transactionState.addOperation(`batch_${i}`, query, result);
        results.push(result);
      } catch (error) {
        // In array transactions, if one fails, all should fail
        throw new Error(`Batch operation ${i} failed: ${(error as Error).message}`);
      }
    }
    
    return results;
  }

  /**
   * Handles callback-style transactions with transactional client
   */
  private async handleCallbackTransaction(
    callback: Function,
    mockClient: MockPrismaClient,
    transactionState: TransactionState
  ): Promise<any> {
    // Create transactional client that tracks operations
    const transactionalClient = this.createTransactionalClient(mockClient, transactionState);
    
    try {
      return await callback(transactionalClient);
    } catch (error) {
      // Callback-style transactions can have custom error handling
      throw error;
    }
  }

  /**
   * Creates a transactional client that tracks operations within the transaction
   */
  private createTransactionalClient(
    mockClient: MockPrismaClient,
    transactionState: TransactionState
  ): MockPrismaClient {
    // Create a proxy that wraps all operations with transaction tracking
    const transactionalClient = { ...mockClient };

    // Wrap conversation operations
    transactionalClient.conversation = {
      ...mockClient.conversation,
      create: vi.fn().mockImplementation(async (args) => {
        const result = await mockClient.conversation.create(args);
        transactionState.addOperation('conversation.create', args, result);
        return result;
      }),
      update: vi.fn().mockImplementation(async (args) => {
        const result = await mockClient.conversation.update(args);
        transactionState.addOperation('conversation.update', args, result);
        return result;
      }),
      delete: vi.fn().mockImplementation(async (args) => {
        const result = await mockClient.conversation.delete(args);
        transactionState.addOperation('conversation.delete', args, result);
        return result;
      }),
      findUnique: mockClient.conversation.findUnique,
      findMany: mockClient.conversation.findMany,
      count: mockClient.conversation.count,
      deleteMany: mockClient.conversation.deleteMany,
    };

    // Wrap message operations
    transactionalClient.message = {
      ...mockClient.message,
      create: vi.fn().mockImplementation(async (args) => {
        const result = await mockClient.message.create(args);
        transactionState.addOperation('message.create', args, result);
        return result;
      }),
      update: vi.fn().mockImplementation(async (args) => {
        const result = await mockClient.message.update(args);
        transactionState.addOperation('message.update', args, result);
        return result;
      }),
      delete: vi.fn().mockImplementation(async (args) => {
        const result = await mockClient.message.delete(args);
        transactionState.addOperation('message.delete', args, result);
        return result;
      }),
      deleteMany: vi.fn().mockImplementation(async (args) => {
        const result = await mockClient.message.deleteMany(args);
        transactionState.addOperation('message.deleteMany', args, result);
        return result;
      }),
      findUnique: mockClient.message.findUnique,
      findMany: mockClient.message.findMany,
      groupBy: mockClient.message.groupBy,
    };

    return transactionalClient;
  }

  /**
   * Simulates query execution (mock implementation)
   */
  private async executeQuery(query: any, operationId: string): Promise<any> {
    // In a real implementation, this would execute the mocked query
    // For now, we'll simulate successful execution
    return { id: `mock_${operationId}`, success: true };
  }

  /**
   * Simulates transaction conflicts and deadlocks
   */
  static simulateDeadlock(): never {
    const error = new Error('Transaction deadlock detected') as TransactionError;
    error.code = 'P2034';
    error.meta = { 
      target: ['conversation', 'message'],
      deadlockDetected: true 
    };
    throw error;
  }

  /**
   * Simulates transaction timeout
   */
  static simulateTimeout(): never {
    const error = new Error('Transaction timeout') as TransactionError;
    error.code = 'P2024';
    error.meta = { timeout: true };
    throw error;
  }

  /**
   * Get statistics about active transactions (for debugging)
   */
  getTransactionStats() {
    return {
      activeTransactions: this.activeTransactions.size,
      totalTransactions: AdvancedTransactionMock.transactionCount,
    };
  }
}

/**
 * Convenience functions for setting up advanced transaction mocks
 */
export const TransactionMocks = {
  /**
   * Setup basic transaction mock (current behavior)
   */
  basic: (mockClient: MockPrismaClient): void => {
    mockClient.$transaction.mockImplementation((queries: any) => {
      if (Array.isArray(queries)) {
        return Promise.all(queries.map((query: any) => query));
      }
      if (typeof queries === 'function') {
        return queries(mockClient);
      }
      return Promise.resolve();
    });
  },

  /**
   * Setup advanced transaction mock with rollback simulation
   */
  withRollback: (mockClient: MockPrismaClient): AdvancedTransactionMock => {
    const advancedMock = new AdvancedTransactionMock({ enableRollback: true });
    advancedMock.createTransactionMock(mockClient);
    return advancedMock;
  },

  /**
   * Setup advanced transaction mock with full features
   */
  advanced: (
    mockClient: MockPrismaClient, 
    options: TransactionOptions = {}
  ): AdvancedTransactionMock => {
    const advancedMock = new AdvancedTransactionMock(options);
    advancedMock.createTransactionMock(mockClient);
    return advancedMock;
  },

  /**
   * Setup transaction mock that always fails (for error testing)
   */
  alwaysFails: (mockClient: MockPrismaClient, errorMessage = 'Transaction failed'): void => {
    mockClient.$transaction.mockRejectedValue(new Error(errorMessage));
  },
};