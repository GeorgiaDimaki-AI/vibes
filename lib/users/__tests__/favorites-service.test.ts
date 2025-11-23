import { describe, it, expect, beforeEach } from 'vitest';
import { FavoritesService } from '../favorites-service';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { Vibe } from '@/lib/types';

describe('FavoritesService', () => {
  let store: MemoryGraphStore;
  let favoritesService: FavoritesService;
  let testUserId: string;

  beforeEach(() => {
    store = new MemoryGraphStore();
    favoritesService = new FavoritesService(store);
    testUserId = 'test-user-123';
  });

  const createMockVibe = (id: string, name: string): Vibe => ({
    id,
    name,
    description: 'Test vibe',
    category: 'trend',
    keywords: ['test'],
    strength: 0.8,
    sentiment: 'positive',
    timestamp: new Date(),
    sources: [],
    firstSeen: new Date(),
    lastSeen: new Date(),
    currentRelevance: 0.8,
    interestBoostsApplied: [],
  });

  describe('addFavorite', () => {
    it('should add a vibe favorite successfully', async () => {
      const vibe = createMockVibe('vibe1', 'AI Revolution');
      await store.saveVibe(vibe);

      const favoriteId = await favoritesService.addFavorite(
        testUserId,
        'vibe',
        'vibe1',
        'Great vibe!'
      );

      expect(favoriteId).toBeDefined();
      expect(typeof favoriteId).toBe('string');

      const favorites = await favoritesService.getFavorites(testUserId);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].type).toBe('vibe');
      expect(favorites[0].referenceId).toBe('vibe1');
      expect(favorites[0].note).toBe('Great vibe!');
      expect(favorites[0].metadata?.vibeName).toBe('AI Revolution');
    });

    it('should add an advice favorite successfully', async () => {
      const favoriteId = await favoritesService.addFavorite(
        testUserId,
        'advice',
        'advice123'
      );

      expect(favoriteId).toBeDefined();

      const favorites = await favoritesService.getFavorites(testUserId);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].type).toBe('advice');
      expect(favorites[0].referenceId).toBe('advice123');
    });

    it('should throw error when adding duplicate favorite', async () => {
      const vibe = createMockVibe('vibe1', 'AI Revolution');
      await store.saveVibe(vibe);

      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');

      await expect(
        favoritesService.addFavorite(testUserId, 'vibe', 'vibe1')
      ).rejects.toThrow('already favorited');
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite successfully', async () => {
      const favoriteId = await favoritesService.addFavorite(
        testUserId,
        'vibe',
        'vibe1'
      );

      await favoritesService.removeFavorite(favoriteId, testUserId);

      const favorites = await favoritesService.getFavorites(testUserId);
      expect(favorites).toHaveLength(0);
    });

    it('should throw error when removing non-existent favorite', async () => {
      await expect(
        favoritesService.removeFavorite('non-existent', testUserId)
      ).rejects.toThrow('not found');
    });

    it('should throw error when removing other user\'s favorite', async () => {
      const favoriteId = await favoritesService.addFavorite(
        'user1',
        'vibe',
        'vibe1'
      );

      await expect(
        favoritesService.removeFavorite(favoriteId, 'user2')
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getFavorites', () => {
    it('should return empty array for user with no favorites', async () => {
      const favorites = await favoritesService.getFavorites('new-user');
      expect(favorites).toEqual([]);
    });

    it('should return all favorites for a user', async () => {
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');
      await favoritesService.addFavorite(testUserId, 'advice', 'advice1');
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe2');

      const favorites = await favoritesService.getFavorites(testUserId);
      expect(favorites).toHaveLength(3);
    });

    it('should filter favorites by type', async () => {
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');
      await favoritesService.addFavorite(testUserId, 'advice', 'advice1');
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe2');

      const vibeFavorites = await favoritesService.getFavorites(testUserId, 'vibe');
      expect(vibeFavorites).toHaveLength(2);
      expect(vibeFavorites.every(f => f.type === 'vibe')).toBe(true);

      const adviceFavorites = await favoritesService.getFavorites(testUserId, 'advice');
      expect(adviceFavorites).toHaveLength(1);
      expect(adviceFavorites[0].type).toBe('advice');
    });

    it('should return favorites in descending order by timestamp', async () => {
      const id1 = await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');
      await new Promise(resolve => setTimeout(resolve, 10));

      const id2 = await favoritesService.addFavorite(testUserId, 'vibe', 'vibe2');
      await new Promise(resolve => setTimeout(resolve, 10));

      const id3 = await favoritesService.addFavorite(testUserId, 'vibe', 'vibe3');

      const favorites = await favoritesService.getFavorites(testUserId);

      // Should be in reverse chronological order
      expect(favorites[0].id).toBe(id3);
      expect(favorites[1].id).toBe(id2);
      expect(favorites[2].id).toBe(id1);
    });
  });

  describe('isFavorited', () => {
    it('should return true for favorited item', async () => {
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');

      const isFavorited = await favoritesService.isFavorited(
        testUserId,
        'vibe',
        'vibe1'
      );

      expect(isFavorited).toBe(true);
    });

    it('should return false for non-favorited item', async () => {
      const isFavorited = await favoritesService.isFavorited(
        testUserId,
        'vibe',
        'vibe1'
      );

      expect(isFavorited).toBe(false);
    });

    it('should differentiate between types', async () => {
      await favoritesService.addFavorite(testUserId, 'vibe', 'item1');

      const isVibeFavorited = await favoritesService.isFavorited(
        testUserId,
        'vibe',
        'item1'
      );
      expect(isVibeFavorited).toBe(true);

      const isAdviceFavorited = await favoritesService.isFavorited(
        testUserId,
        'advice',
        'item1'
      );
      expect(isAdviceFavorited).toBe(false);
    });
  });

  describe('getFavoriteCount', () => {
    it('should return correct count for all favorites', async () => {
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');
      await favoritesService.addFavorite(testUserId, 'advice', 'advice1');
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe2');

      const count = await favoritesService.getFavoriteCount(testUserId);
      expect(count).toBe(3);
    });

    it('should return correct count by type', async () => {
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');
      await favoritesService.addFavorite(testUserId, 'advice', 'advice1');
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe2');

      const vibeCount = await favoritesService.getFavoriteCount(testUserId, 'vibe');
      expect(vibeCount).toBe(2);

      const adviceCount = await favoritesService.getFavoriteCount(testUserId, 'advice');
      expect(adviceCount).toBe(1);
    });

    it('should return 0 for user with no favorites', async () => {
      const count = await favoritesService.getFavoriteCount('new-user');
      expect(count).toBe(0);
    });
  });
});
