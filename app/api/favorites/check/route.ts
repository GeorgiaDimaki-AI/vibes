/**
 * Check Favorite API Route
 * POST /api/favorites/check - Check if item is favorited
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/graph';
import { FavoritesService } from '@/lib/users/favorites-service';

/**
 * POST /api/favorites/check
 * Check if an item is favorited
 * Body: { type: 'vibe' | 'advice', referenceId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Replace with actual auth when Agent 3 implements it
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: userId required for testing' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, referenceId } = body;

    // Validate input
    if (!type || !referenceId) {
      return NextResponse.json(
        { error: 'Missing required fields: type and referenceId' },
        { status: 400 }
      );
    }

    if (type !== 'vibe' && type !== 'advice') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "vibe" or "advice"' },
        { status: 400 }
      );
    }

    const store = getStore();
    const favoritesService = new FavoritesService(store);

    const isFavorited = await favoritesService.isFavorited(
      userId,
      type,
      referenceId
    );

    return NextResponse.json({ isFavorited });
  } catch (error: any) {
    console.error('Error checking favorite:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check favorite' },
      { status: 500 }
    );
  }
}
