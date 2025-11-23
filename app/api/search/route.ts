/**
 * Search API endpoint
 * GET /api/search?q=query&limit=20 - Search vibes
 */

import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    // SECURITY: Validate query parameter
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // SECURITY: Minimum query length to prevent abuse
    if (query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // SECURITY: Maximum query length to prevent DoS
    if (query.length > 200) {
      return NextResponse.json(
        { error: 'Query must be less than 200 characters' },
        { status: 400 }
      );
    }

    // SECURITY: Validate and bound limit parameter to prevent resource exhaustion
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

    const vibes = await zeitgeist.searchVibes(query, limit);

    return NextResponse.json({ vibes, limit });
  } catch (error) {
    console.error('Search failed:', error);
    // SECURITY: Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        error: 'Search failed',
        details: isProduction ? undefined : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
