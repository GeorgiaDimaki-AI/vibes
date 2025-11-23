/**
 * Analytics Insights API endpoint
 * GET /api/analytics/insights - Get comprehensive user insights
 *
 * AUTHENTICATION: Required - User must be authenticated
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { handleAPIError } from '@/lib/middleware/api-errors';
import { getStore } from '@/lib/graph';
import { AnalyticsService } from '@/lib/users/analytics-service';

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Authenticate user
    const userProfile = await requireAuth(request);

    // STEP 2: Get analytics service
    const store = getStore();
    const analyticsService = new AnalyticsService(store);

    // STEP 3: Generate insights
    const insights = await analyticsService.getUserInsights(userProfile.id);

    // STEP 4: Return insights
    return NextResponse.json({ insights });
  } catch (error) {
    // Centralized error handling
    return handleAPIError(error);
  }
}
