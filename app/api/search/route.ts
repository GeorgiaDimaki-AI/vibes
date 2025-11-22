/**
 * Search API endpoint
 * GET /api/search?q=query - Search vibes
 */

import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '20');
    const vibes = await zeitgeist.searchVibes(query, limit);

    return NextResponse.json({ vibes });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
