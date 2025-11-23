/**
 * Network utility functions for resilient API calls
 * Provides timeout handling and retry logic with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch with configurable timeout using AbortController
 * @param url URL to fetch
 * @param options Fetch options with optional timeout
 * @returns Response promise
 * @throws Error if request times out or fails
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry configuration
 * @returns Result from successful function call
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or if shouldRetry returns false
      if (attempt === maxRetries - 1 || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
      const delay = exponentialDelay + jitter;

      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`,
        error instanceof Error ? error.message : error
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Determines if an error is retryable
 * Network errors and 5xx status codes are retryable
 * 4xx client errors are not retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Timeout errors are retryable
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }

  // Check HTTP status codes (only retry 5xx server errors)
  if (error.response?.status) {
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  // By default, retry
  return true;
}

/**
 * Limit concurrent async operations
 * @param items Items to process
 * @param fn Function to apply to each item
 * @param concurrency Maximum concurrent operations
 * @returns Array of results
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Sanitize user input to prevent prompt injection
 * @param text User-provided text
 * @param maxLength Maximum length to allow
 * @returns Sanitized text
 */
export function sanitizeUserInput(text: string, maxLength = 2000): string {
  return text
    // Escape code blocks that could break prompt formatting
    .replace(/```/g, '\\`\\`\\`')
    // Remove common injection instruction phrases
    .replace(/ignore\s+(previous|all|above)\s+instructions?/gi, '[removed]')
    .replace(/disregard\s+(previous|all|above)/gi, '[removed]')
    .replace(/forget\s+(previous|all|above)/gi, '[removed]')
    // Remove system-like markers
    .replace(/IMPORTANT:/gi, 'Important:')
    .replace(/SYSTEM:/gi, 'System:')
    .replace(/ASSISTANT:/gi, 'Assistant:')
    // Limit consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim and limit length
    .trim()
    .slice(0, maxLength);
}
