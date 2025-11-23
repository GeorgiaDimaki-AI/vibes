/**
 * Favorites Service
 * Manages user's favorite vibes and advice
 */

import { GraphStore } from '@/lib/graph/store';
import { UserFavorite } from '@/lib/types';
import { randomUUID } from 'crypto';

export class FavoritesService {
  constructor(private store: GraphStore) {}

  /**
   * Add a favorite (vibe or advice)
   */
  async addFavorite(
    userId: string,
    type: 'vibe' | 'advice',
    referenceId: string,
    note?: string
  ): Promise<string> {
    // Check if already favorited
    const exists = await this.isFavorited(userId, type, referenceId);
    if (exists) {
      throw new Error('Item is already favorited');
    }

    const id = randomUUID();
    const timestamp = new Date();

    // Get metadata for denormalization
    let metadata: UserFavorite['metadata'] = undefined;

    if (type === 'vibe') {
      const vibe = await this.store.getVibe(referenceId);
      if (vibe) {
        metadata = { vibeName: vibe.name };
      }
    } else if (type === 'advice') {
      const adviceHistory = await this.store.getAdviceHistoryItem(referenceId);
      if (adviceHistory) {
        metadata = {
          scenarioDescription: adviceHistory.scenario.description,
        };
      }
    }

    const favorite: UserFavorite = {
      id,
      userId,
      type,
      referenceId,
      timestamp,
      note,
      metadata,
    };

    await this.store.saveFavorite(favorite);
    return id;
  }

  /**
   * Remove a favorite
   */
  async removeFavorite(id: string, userId: string): Promise<void> {
    const favorite = await this.getFavoriteById(id);

    if (!favorite) {
      throw new Error('Favorite not found');
    }

    // Verify ownership
    if (favorite.userId !== userId) {
      throw new Error('Unauthorized: Cannot remove other user\'s favorite');
    }

    await this.store.deleteFavorite(id);
  }

  /**
   * Get all favorites for a user, optionally filtered by type
   */
  async getFavorites(
    userId: string,
    type?: 'vibe' | 'advice'
  ): Promise<UserFavorite[]> {
    return this.store.getFavorites(userId, type);
  }

  /**
   * Check if an item is favorited
   */
  async isFavorited(
    userId: string,
    type: 'vibe' | 'advice',
    referenceId: string
  ): Promise<boolean> {
    return this.store.checkFavoriteExists(userId, type, referenceId);
  }

  /**
   * Get count of favorites for a user
   */
  async getFavoriteCount(
    userId: string,
    type?: 'vibe' | 'advice'
  ): Promise<number> {
    const favorites = await this.getFavorites(userId, type);
    return favorites.length;
  }

  /**
   * Get a specific favorite by ID (internal helper)
   */
  private async getFavoriteById(id: string): Promise<UserFavorite | null> {
    return this.store.getFavoriteById(id);
  }
}
