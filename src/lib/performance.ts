// Performance utilities for handling Supabase timeouts and retries

export const QUERY_TIMEOUT = 10000; // 10 seconds
export const RETRY_COUNT = 3;
export const RETRY_DELAY = 1000; // 1 second

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
  timeoutMs?: number;
}

/**
 * Wraps a query with timeout and retry logic
 */
export async function withTimeoutAndRetry<T>(
  queryFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = RETRY_COUNT,
    delay = RETRY_DELAY,
    backoff = true,
    timeoutMs = QUERY_TIMEOUT
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
      );

      // Race the query against the timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on auth errors or client errors
      if (error instanceof Error) {
        if (error.message.includes('auth') || 
            error.message.includes('403') || 
            error.message.includes('401')) {
          throw error;
        }
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (with exponential backoff if enabled)
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

/**
 * Default SWR configuration for optimal performance
 */
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 30000, // 30 seconds
  shouldRetryOnError: (error: Error) => {
    // Don't retry on auth errors or permission errors
    return !error.message?.includes('auth') && 
           !error.message?.includes('403') && 
           !error.message?.includes('401');
  },
  onError: (error: Error) => {
    console.error('SWR Error:', error);
  }
};

/**
 * Optimized SWR config for frequently changing data
 */
export const swrConfigRealtime = {
  ...swrConfig,
  dedupingInterval: 5000, // 5 seconds
  refreshInterval: 30000, // Auto-refresh every 30 seconds
};

/**
 * Optimized SWR config for static/rarely changing data
 */
export const swrConfigStatic = {
  ...swrConfig,
  dedupingInterval: 300000, // 5 minutes
  revalidateOnMount: true,
  revalidateIfStale: false,
};

/**
 * Batches multiple queries to reduce database load
 */
export class QueryBatcher {
  private batches: Map<string, Promise<any>> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  async batch<T>(
    key: string,
    queryFn: () => Promise<T>,
    delayMs: number = 100
  ): Promise<T> {
    // If we already have a batch for this key, return it
    if (this.batches.has(key)) {
      return this.batches.get(key)!;
    }

    // Clear any existing timeout for this key
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Create a promise that will execute after a delay
    const batchPromise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          const result = await queryFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          // Clean up
          this.batches.delete(key);
          this.timeouts.delete(key);
        }
      }, delayMs);

      this.timeouts.set(key, timeout);
    });

    this.batches.set(key, batchPromise);
    return batchPromise;
  }
}