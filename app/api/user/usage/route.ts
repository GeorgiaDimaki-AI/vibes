/**
 * User Usage API endpoint
 * GET /api/user/usage - Get current month usage statistics
 *
 * AUTHENTICATION: Required - User must be authenticated
 * RATE LIMITING: Not enforced on usage queries (read-only information)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { userService } from '@/lib/users/user-service';
import { handleAPIError } from '@/lib/middleware/api-errors';
import { getRateLimitInfo } from '@/lib/middleware/rate-limit';

/**
 * GET /api/user/usage
 * Get current usage statistics for the authenticated user
 *
 * Returns:
 * - Current month usage count
 * - Query limit based on tier
 * - Remaining queries
 * - Reset date (first day of next month)
 * - Tier information
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userProfile = await requireAuth(request);

    // Get rate limit info (without incrementing count)
    const rateLimitInfo = await getRateLimitInfo(userProfile.id);

    // Get usage for current month
    const queriesUsed = await userService.getUsageThisMonth(userProfile.id);

    // Calculate usage percentage
    const usagePercentage = userProfile.tier === 'unlimited'
      ? 0  // Not applicable for unlimited
      : (queriesUsed / userProfile.queryLimit) * 100;

    // Prepare response
    const usageData = {
      // Current usage
      queriesUsed,
      queriesRemaining: rateLimitInfo.remaining,
      queryLimit: rateLimitInfo.limit,
      resetDate: rateLimitInfo.resetDate,

      // Tier information
      tier: userProfile.tier,
      isUnlimited: userProfile.tier === 'unlimited',

      // Usage analytics
      usagePercentage: Math.round(usagePercentage),
      canMakeQuery: rateLimitInfo.allowed,

      // Warning flags
      warnings: {
        nearLimit: usagePercentage >= 80 && userProfile.tier !== 'unlimited',
        atLimit: !rateLimitInfo.allowed,
      },

      // Timestamp
      timestamp: new Date(),
    };

    return NextResponse.json(usageData);
  } catch (error) {
    return handleAPIError(error);
  }
}
