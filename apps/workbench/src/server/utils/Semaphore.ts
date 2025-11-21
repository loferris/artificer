/**
 * Semaphore for controlling concurrent execution
 * Limits the number of tasks that can run simultaneously
 */

export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    if (permits <= 0) {
      throw new Error('Semaphore permits must be greater than 0');
    }
    this.permits = permits;
  }

  /**
   * Acquire a permit
   * Blocks until a permit is available
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    // No permits available, wait in queue
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release a permit
   * Allows a waiting task to proceed
   */
  release(): void {
    if (this.queue.length > 0) {
      // Wake up a waiting task
      const resolve = this.queue.shift();
      resolve?.();
    } else {
      // No waiting tasks, increment permits
      this.permits++;
    }
  }

  /**
   * Get current number of available permits
   */
  availablePermits(): number {
    return this.permits;
  }

  /**
   * Get number of tasks waiting for permits
   */
  queueLength(): number {
    return this.queue.length;
  }

  /**
   * Execute a function with automatic acquire/release
   */
  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Resource lock that automatically releases on completion
 * Useful for ensuring cleanup even if errors occur
 */
export class ResourceLock {
  private released = false;

  constructor(
    private semaphore: Semaphore,
    private onRelease?: () => void | Promise<void>
  ) {}

  /**
   * Release the lock
   */
  async release(): Promise<void> {
    if (this.released) {
      return;
    }

    this.released = true;
    this.semaphore.release();

    if (this.onRelease) {
      await this.onRelease();
    }
  }

  /**
   * Check if lock has been released
   */
  isReleased(): boolean {
    return this.released;
  }
}
