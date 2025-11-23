/**
 * Analytics Metrics API endpoint
 * GET /api/analytics/metrics?month=2025-11 - Get monthly metrics
 *
 * AUTHENTICATION: Required - User must be authenticated
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { handleAPIError } from '@/lib/middleware/api-errors';
import { getStore } from '@/lib/graph';
import { AnalyticsService } from '@/lib/users/analytics-service';

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Authenticate user
    const userProfile = await requireAuth(request);

    // STEP 2: Parse query parameters
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || getCurrentMonth();

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM (e.g., 2025-11)' },
        { status: 400 }
      );
    }

    // STEP 3: Get analytics service
    const store = getStore();
    const analyticsService = new AnalyticsService(store);

    // STEP 4: Get metrics
    const metrics = await analyticsService.getMonthlyMetrics(userProfile.id, month);

    // STEP 5: Return metrics (null if no data for this month)
    return NextResponse.json({ metrics });
  } catch (error) {
    // Centralized error handling
    return handleAPIError(error);
  }
}
