/**
 * Rate Limiting Middleware
 *
 * Enforces tier-based rate limits for API routes.
 * Uses UserService to track and enforce query limits.
 *
 * Key Responsibilities:
 * - Check if user has remaining queries for the month
 * - Increment query count after successful check
 * - Provide rate limit information in responses
 * - Throw specific error when limit exceeded
 *
 * Usage in API routes:
 * ```typescript
 * import { checkRateLimit } from '@/lib/middleware/rate-limit';
 *
 * export async function POST(request: Request) {
 *   const user = await requireAuth(request);
 *   const rateLimitInfo = await checkRateLimit(user.id);
 *   // ... handle request
 * }
 * ```
 *
 * @module RateLimitMiddleware
 */

import { userService } from '@/lib/users/user-service';

/**
 * Rate limit exceeded error
 * Includes details about current limits and reset date
 */
export class RateLimitError extends Error {
  constructor(
    public remaining: number,
    public limit: number,
    public resetDate: Date
  ) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

/**
 * Rate limit information
 * Returned after successful rate limit check
 */
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: Date;
}

/**
 * Get the first day of next month (when rate limits reset)
 * @returns Date object for 00:00:00 on the 1st of next month
 */
function getNextMonthResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

/**
 * Check if a user can make a query based on their tier limits
 * If allowed, increments the query count
 * If not allowed, throws RateLimitError
 *
 * @param userId User ID to check rate limit for
 * @returns RateLimitInfo with current status
 * @throws RateLimitError if user has exceeded their limit
 *
 * @example
 * ```typescript
 * try {
 *   const rateLimitInfo = await checkRateLimit(user.id);
 *   // User can make query, count has been incremented
 *   console.log(`Remaining: ${rateLimitInfo.remaining}`);
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     return Response.json({
 *       error: 'Rate limit exceeded',
 *       limit: error.limit,
 *       resetDate: error.resetDate
 *     }, { status: 429 });
 *   }
 * }
 * ```
 */
export async function checkRateLimit(userId: string): Promise<RateLimitInfo> {
  // Check if user can make a query
  const canQuery = await userService.canMakeQuery(userId);

  if (!canQuery) {
    // User has exceeded limit
    const user = await userService.getUserProfile(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const resetDate = getNextMonthResetDate();
    const remaining = Math.max(0, user.queryLimit - user.queriesThisMonth);

    throw new RateLimitError(remaining, user.queryLimit, resetDate);
  }

  // User can make query - increment count
  await userService.incrementQueryCount(userId);

  // Get updated user info
  const user = await userService.getUserProfile(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const resetDate = getNextMonthResetDate();
  const remaining = user.tier === 'unlimited'
    ? -1  // -1 means unlimited
    : Math.max(0, user.queryLimit - user.queriesThisMonth);

  return {
    allowed: true,
    remaining,
    limit: user.queryLimit,
    resetDate,
  };
}

/**
 * Get rate limit information for a user without incrementing count
 * Useful for displaying current usage to users
 *
 * @param userId User ID to get rate limit info for
 * @returns RateLimitInfo with current status
 *
 * @example
 * ```typescript
 * const info = await getRateLimitInfo(user.id);
 * console.log(`You have ${info.remaining} queries remaining this month`);
 * ```
 */
export async function getRateLimitInfo(userId: string): Promise<RateLimitInfo> {
  const user = await userService.getUserProfile(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const canQuery = await userService.canMakeQuery(userId);
  const resetDate = getNextMonthResetDate();
  const remaining = user.tier === 'unlimited'
    ? -1
    : Math.max(0, user.queryLimit - user.queriesThisMonth);

  return {
    allowed: canQuery,
    remaining,
    limit: user.queryLimit,
    resetDate,
  };
}

/**
 * Create rate limit headers for API responses
 * Follows standard rate limiting header conventions
 *
 * @param info Rate limit information
 * @returns Headers object with rate limit info
 *
 * @example
 * ```typescript
 * const rateLimitInfo = await checkRateLimit(user.id);
 * const headers = createRateLimitHeaders(rateLimitInfo);
 * return Response.json({ advice }, { headers });
 * ```
 */
export function createRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  return {
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': info.resetDate.toISOString(),
  };
}

/**
 * Helper function to handle rate limit errors in API routes
 * Converts rate limit errors to appropriate HTTP responses
 *
 * @param error The error to handle
 * @returns Response object with 429 status and rate limit info
 *
 * @example
 * ```typescript
 * try {
 *   await checkRateLimit(user.id);
 * } catch (error) {
 *   if (error instanceof RateLimitError) {
 *     return handleRateLimitError(error);
 *   }
 * }
 * ```
 */
export function handleRateLimitError(error: RateLimitError): Response {
  const headers = {
    'X-RateLimit-Limit': error.limit.toString(),
    'X-RateLimit-Remaining': error.remaining.toString(),
    'X-RateLimit-Reset': error.resetDate.toISOString(),
  };

  return Response.json(
    {
      error: 'Rate limit exceeded',
      message: `You have used all ${error.limit} queries for this month. Limit resets on ${error.resetDate.toLocaleDateString()}.`,
      limit: error.limit,
      remaining: error.remaining,
      resetDate: error.resetDate.toISOString(),
    },
    { status: 429, headers }
  );
}
