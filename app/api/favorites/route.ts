/**
 * Favorites API Routes
 * GET /api/favorites - Get user's favorites
 * POST /api/favorites - Add a favorite
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/graph';
import { FavoritesService } from '@/lib/users/favorites-service';

/**
 * GET /api/favorites?type=vibe|advice
 * Get user's favorites, optionally filtered by type
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual auth when Agent 3 implements it
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: userId required for testing' },
        { status: 401 }
      );
    }

    const type = request.nextUrl.searchParams.get('type') as 'vibe' | 'advice' | null;

    const store = getStore();
    const favoritesService = new FavoritesService(store);

    const favorites = await favoritesService.getFavorites(
      userId,
      type || undefined
    );

    return NextResponse.json({ favorites });
  } catch (error: any) {
    console.error('Error getting favorites:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get favorites' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 * Add a favorite
 * Body: { type: 'vibe' | 'advice', referenceId: string, note?: string }
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
    const { type, referenceId, note } = body;

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

    const favoriteId = await favoritesService.addFavorite(
      userId,
      type,
      referenceId,
      note
    );

    return NextResponse.json({ favoriteId, success: true });
  } catch (error: any) {
    console.error('Error adding favorite:', error);

    if (error.message.includes('already favorited')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add favorite' },
      { status: 500 }
    );
  }
}
