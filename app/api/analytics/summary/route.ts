/**
 * Analytics Summary API endpoint
 * GET /api/analytics/summary - Get human-readable summary of insights
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

    // STEP 3: Generate summary
    const summary = await analyticsService.getInsightsSummary(userProfile.id);

    // STEP 4: Return summary
    return NextResponse.json({ summary });
  } catch (error) {
    // Centralized error handling
    return handleAPIError(error);
  }
}
