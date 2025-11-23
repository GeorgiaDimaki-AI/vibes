/**
 * Search API endpoint
 * GET /api/search?q=query&limit=20 - Search vibes
 *
 * AUTHENTICATION: Required - User must be authenticated
 * RATE LIMITING: Enforced - Based on user tier (free: 5, light: 25, regular: 100, unlimited: ∞)
 */

import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';
import { requireAuth } from '@/lib/middleware/auth';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { handleAPIError, validateStringLength } from '@/lib/middleware/api-errors';

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Authenticate user
    const userProfile = await requireAuth(request);

    // STEP 2: Check rate limit and increment count
    const rateLimitInfo = await checkRateLimit(userProfile.id);

    // STEP 3: Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    // Validate query parameter exists
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Validate query length
    validateStringLength(query, 'query', 2, 200);

    // Validate and bound limit parameter to prevent resource exhaustion
    const limitParam = searchParams.get('limit') || '20';
    const parsedLimit = parseInt(limitParam, 10);

    if (isNaN(parsedLimit)) {
      return NextResponse.json(
        { error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    // Clamp limit between 1 and 100
    const limit = Math.min(Math.max(parsedLimit, 1), 100);

    // STEP 4: Search vibes (could be personalized in the future based on userProfile)
    const vibes = await zeitgeist.searchVibes(query, limit);

    // STEP 5: Return response with rate limit headers
    const headers = createRateLimitHeaders(rateLimitInfo);

    return NextResponse.json({ vibes, limit }, { headers });
  } catch (error) {
    // Centralized error handling
    return handleAPIError(error);
  }
}
