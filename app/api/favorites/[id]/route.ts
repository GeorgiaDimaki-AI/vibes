/**
 * Favorite Item API Routes
 * DELETE /api/favorites/[id] - Remove a favorite
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/graph';
import { FavoritesService } from '@/lib/users/favorites-service';

/**
 * DELETE /api/favorites/[id]
 * Remove a favorite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Replace with actual auth when Agent 3 implements it
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: userId required for testing' },
        { status: 401 }
      );
    }

    const store = getStore();
    const favoritesService = new FavoritesService(store);

    await favoritesService.removeFavorite(params.id, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing favorite:', error);

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
