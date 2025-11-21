/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when external services are down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests fail immediately
 * - HALF_OPEN: Testing if service has recovered
 */

import { logger } from './logger';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit (default: 5)
  successThreshold: number; // Number of successes to close circuit from half-open (default: 2)
  timeout: number; // Time in ms before attempting retry in half-open state (default: 60000)
  name: string; // Circuit breaker name for logging
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000, // 1 minute
      name: config.name,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(
          `Circuit breaker '${this.config.name}' is OPEN. Service temporarily unavailable.`
        );
        logger.warn('Circuit breaker blocking request', {
          name: this.config.name,
          state: this.state,
          nextAttemptIn: this.nextAttempt - Date.now(),
        });
        throw error;
      }

      // Transition to HALF_OPEN to test recovery
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
      logger.info('Circuit breaker entering HALF_OPEN state', {
        name: this.config.name,
      });
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        // Service recovered, close circuit
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info('Circuit breaker closed (service recovered)', {
          name: this.config.name,
        });
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery test, reopen circuit
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      logger.warn('Circuit breaker reopened (recovery test failed)', {
        name: this.config.name,
        nextAttemptAt: new Date(this.nextAttempt).toISOString(),
      });
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures, open circuit
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      logger.error('Circuit breaker opened (failure threshold exceeded)', {
        name: this.config.name,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        nextAttemptAt: new Date(this.nextAttempt).toISOString(),
      });
    }
  }

  /**
   * Get current circuit state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    return {
      name: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt).toISOString() : null,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    logger.info('Circuit breaker manually reset', {
      name: this.config.name,
    });
  }
}

/**
 * Circuit Breaker Registry
 * Manages circuit breakers for different services
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(
        name,
        new CircuitBreaker({
          name,
          failureThreshold: config?.failureThreshold || 5,
          successThreshold: config?.successThreshold || 2,
          timeout: config?.timeout || 60000,
        })
      );
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats() {
    const stats: any[] = [];
    this.breakers.forEach((breaker) => {
      stats.push(breaker.getStats());
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
