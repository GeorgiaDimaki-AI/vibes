import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getFavorites, POST as addFavorite } from '../favorites/route';
import { DELETE as deleteFavorite } from '../favorites/[id]/route';
import { POST as checkFavorite } from '../favorites/check/route';
import { NextRequest } from 'next/server';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { FavoritesService } from '@/lib/users/favorites-service';

// Mock getStore to use MemoryGraphStore in tests
vi.mock('@/lib/graph', () => ({
  getStore: () => testStore,
}));

let testStore: MemoryGraphStore;

describe('Favorites API Routes', () => {
  let testUserId: string;
  let favoritesService: FavoritesService;

  beforeEach(async () => {
    testUserId = 'test-user-123';
    testStore = new MemoryGraphStore();
    favoritesService = new FavoritesService(testStore);
  });

  describe('POST /api/favorites', () => {
    it('should add a favorite', async () => {
      const url = `http://localhost:3000/api/favorites?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'vibe',
          referenceId: 'vibe123',
          note: 'Love this vibe!',
        }),
      });

      const response = await addFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favoriteId).toBeDefined();
      expect(data.success).toBe(true);

      // Verify favorite was added
      const favorites = await favoritesService.getFavorites(testUserId);
      expect(favorites).toHaveLength(1);
      expect(favorites[0].referenceId).toBe('vibe123');
    });

    it('should reject missing fields', async () => {
      const url = `http://localhost:3000/api/favorites?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'vibe',
          // missing referenceId
        }),
      });

      const response = await addFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject invalid type', async () => {
      const url = `http://localhost:3000/api/favorites?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid',
          referenceId: 'ref123',
        }),
      });

      const response = await addFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });

    it('should reject duplicate favorites', async () => {
      // Add first favorite
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe123');

      // Try to add again
      const url = `http://localhost:3000/api/favorites?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'vibe',
          referenceId: 'vibe123',
        }),
      });

      const response = await addFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already favorited');
    });

    it('should require userId', async () => {
      const url = `http://localhost:3000/api/favorites`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'vibe',
          referenceId: 'vibe123',
        }),
      });

      const response = await addFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('GET /api/favorites', () => {
    it('should return user favorites', async () => {
      // Add some favorites
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');
      await favoritesService.addFavorite(testUserId, 'advice', 'advice1');

      const url = `http://localhost:3000/api/favorites?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await getFavorites(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorites).toBeDefined();
      expect(Array.isArray(data.favorites)).toBe(true);
      expect(data.favorites).toHaveLength(2);
    });

    it('should filter favorites by type', async () => {
      // Add favorites of different types
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe1');
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe2');
      await favoritesService.addFavorite(testUserId, 'advice', 'advice1');

      const url = `http://localhost:3000/api/favorites?userId=${testUserId}&type=vibe`;
      const request = new NextRequest(url);

      const response = await getFavorites(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorites).toHaveLength(2);
      expect(data.favorites.every((f: any) => f.type === 'vibe')).toBe(true);
    });

    it('should return empty array for user with no favorites', async () => {
      const url = `http://localhost:3000/api/favorites?userId=new-user`;
      const request = new NextRequest(url);

      const response = await getFavorites(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.favorites).toEqual([]);
    });
  });

  describe('DELETE /api/favorites/[id]', () => {
    it('should delete a favorite', async () => {
      const favoriteId = await favoritesService.addFavorite(
        testUserId,
        'vibe',
        'vibe123'
      );

      const url = `http://localhost:3000/api/favorites/${favoriteId}?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await deleteFavorite(request, { params: { id: favoriteId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify favorite is deleted
      const favorites = await favoritesService.getFavorites(testUserId);
      expect(favorites).toHaveLength(0);
    });

    it('should return 404 for non-existent favorite', async () => {
      const url = `http://localhost:3000/api/favorites/non-existent?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await deleteFavorite(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should prevent deleting other user\'s favorite', async () => {
      const favoriteId = await favoritesService.addFavorite(
        'user1',
        'vibe',
        'vibe123'
      );

      const url = `http://localhost:3000/api/favorites/${favoriteId}?userId=user2`;
      const request = new NextRequest(url);

      const response = await deleteFavorite(request, { params: { id: favoriteId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('POST /api/favorites/check', () => {
    it('should return true for favorited item', async () => {
      await favoritesService.addFavorite(testUserId, 'vibe', 'vibe123');

      const url = `http://localhost:3000/api/favorites/check?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'vibe',
          referenceId: 'vibe123',
        }),
      });

      const response = await checkFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFavorited).toBe(true);
    });

    it('should return false for non-favorited item', async () => {
      const url = `http://localhost:3000/api/favorites/check?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'vibe',
          referenceId: 'vibe123',
        }),
      });

      const response = await checkFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFavorited).toBe(false);
    });

    it('should reject missing fields', async () => {
      const url = `http://localhost:3000/api/favorites/check?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'vibe',
          // missing referenceId
        }),
      });

      const response = await checkFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject invalid type', async () => {
      const url = `http://localhost:3000/api/favorites/check?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid',
          referenceId: 'ref123',
        }),
      });

      const response = await checkFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });
  });
});
