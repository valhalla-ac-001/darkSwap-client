/**
 * Rate limiter utility to control the frequency of function calls
 */
export class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastExecutionTime = 0;

  constructor(
    private readonly requestsPerSecond: number,
    private readonly maxConcurrent: number = 1
  ) {}

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const minDelayMs = 1000 / this.requestsPerSecond;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastExecution = now - this.lastExecutionTime;

      if (timeSinceLastExecution < minDelayMs) {
        await this.sleep(minDelayMs - timeSinceLastExecution);
      }

      const task = this.queue.shift();
      if (task) {
        this.lastExecutionTime = Date.now();
        await task();
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Batch processor for executing tasks in controlled batches with delays
 */
export class BatchProcessor {
  constructor(
    private readonly batchSize: number,
    private readonly delayBetweenBatchesMs: number
  ) {}

  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      
      results.push(...batchResults);
      
      // Add delay between batches (except for the last batch)
      if (i + this.batchSize < items.length) {
        await this.sleep(this.delayBetweenBatchesMs);
      }
    }
    
    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
