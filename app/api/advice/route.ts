/**
 * Advice API endpoint
 * POST /api/advice - Get advice for a scenario
 *
 * AUTHENTICATION: Required - User must be authenticated
 * RATE LIMITING: Enforced - Based on user tier (free: 5, light: 25, regular: 100, unlimited: ∞)
 */

import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';
import { Scenario } from '@/lib/types';
import { requireAuth } from '@/lib/middleware/auth';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { handleAPIError, validateStringLength } from '@/lib/middleware/api-errors';
import { getStore } from '@/lib/graph';
import { HistoryService } from '@/lib/users/history-service';

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authenticate user
    const userProfile = await requireAuth(request);

    // STEP 2: Check rate limit and increment count
    const rateLimitInfo = await checkRateLimit(userProfile.id);

    // STEP 3: Parse and validate request body
    const body = await request.json();
    const scenario: Scenario = body;

    // Validate scenario description
    if (!scenario.description) {
      return NextResponse.json(
        { error: 'Scenario description is required' },
        { status: 400 }
      );
    }

    // Validate description length
    validateStringLength(scenario.description, 'description', 5, 5000);

    // STEP 4: Get advice with user personalization
    const advice = await zeitgeist.getAdvice(scenario, userProfile);

    // STEP 5: Save to history (don't block response on this)
    try {
      const store = getStore();
      const historyService = new HistoryService(store);

      // Extract vibe IDs from matched vibes
      const matchedVibes = advice.matchedVibes.map(match => match.vibe.id);

      // Save history asynchronously
      historyService.saveAdvice({
        userId: userProfile.id,
        scenario,
        advice,
        matchedVibes,
        regionFilterApplied: userProfile.region,
        interestBoostsApplied: userProfile.interests,
      }).catch(error => {
        // Log error but don't fail the request
        console.error('Failed to save advice history:', error);
      });
    } catch (error) {
      // Log error but don't fail the request
      console.error('Error setting up history save:', error);
    }

    // STEP 6: Return response with rate limit headers
    const headers = createRateLimitHeaders(rateLimitInfo);

    return NextResponse.json(advice, { headers });
  } catch (error) {
    // Centralized error handling
    return handleAPIError(error);
  }
}
