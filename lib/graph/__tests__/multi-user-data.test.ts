/**
 * Multi-User Data Handling Tests
 *
 * Tests database operations for multi-user functionality:
 * - User creation and retrieval
 * - Cascade deletion
 * - Monthly query resets
 * - Usage metrics aggregation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { UserProfile, AdviceHistory, UserFavorite, Scenario, Advice, Vibe } from '@/lib/types';

describe('Multi-User Data Handling', () => {
  let store: MemoryGraphStore;

  beforeEach(() => {
    store = new MemoryGraphStore();
  });

  describe('User Creation and Retrieval', () => {
    it('should create and retrieve user profiles correctly', async () => {
      const user: UserProfile = {
        id: 'test-user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: ['tech'],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };

      await store.saveUser(user);

      const retrieved = await store.getUser(user.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(user.id);
      expect(retrieved?.email).toBe(user.email);
      expect(retrieved?.tier).toBe('free');
      expect(retrieved?.queryLimit).toBe(5);
    });

    it('should persist user preferences correctly', async () => {
      const user: UserProfile = {
        id: 'test-user-2',
        email: 'prefs@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        region: 'US-West',
        interests: ['tech', 'fashion', 'music'],
        avoidTopics: ['politics', 'sports'],
        conversationStyle: 'professional',
        emailNotifications: false,
        shareDataForResearch: true,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      const retrieved = await store.getUser(user.id);

      expect(retrieved?.region).toBe('US-West');
      expect(retrieved?.interests).toEqual(['tech', 'fashion', 'music']);
      expect(retrieved?.avoidTopics).toEqual(['politics', 'sports']);
      expect(retrieved?.conversationStyle).toBe('professional');
      expect(retrieved?.emailNotifications).toBe(false);
      expect(retrieved?.shareDataForResearch).toBe(true);
    });

    it('should update user profiles', async () => {
      const user: UserProfile = {
        id: 'test-user-3',
        email: 'update@example.com',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };

      await store.saveUser(user);

      // Update user
      const updated: UserProfile = {
        ...user,
        displayName: 'Updated Name',
        tier: 'regular',
        queryLimit: 100,
        interests: ['tech'],
        onboardingCompleted: true,
      };

      await store.saveUser(updated);

      const retrieved = await store.getUser(user.id);

      expect(retrieved?.displayName).toBe('Updated Name');
      expect(retrieved?.tier).toBe('regular');
      expect(retrieved?.queryLimit).toBe(100);
      expect(retrieved?.interests).toEqual(['tech']);
      expect(retrieved?.onboardingCompleted).toBe(true);
    });

    it('should handle non-existent users', async () => {
      const retrieved = await store.getUser('non-existent-user');
      expect(retrieved).toBeNull();
    });

    it('should list all users', async () => {
      const users: UserProfile[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          tier: 'free',
          queriesThisMonth: 0,
          queryLimit: 5,
          interests: [],
          avoidTopics: [],
          conversationStyle: 'casual',
          emailNotifications: true,
          shareDataForResearch: false,
          createdAt: new Date(),
          lastActive: new Date(),
          onboardingCompleted: false,
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          tier: 'regular',
          queriesThisMonth: 0,
          queryLimit: 100,
          interests: [],
          avoidTopics: [],
          conversationStyle: 'casual',
          emailNotifications: true,
          shareDataForResearch: false,
          createdAt: new Date(),
          lastActive: new Date(),
          onboardingCompleted: true,
        },
      ];

      for (const user of users) {
        await store.saveUser(user);
      }

      const allUsers = await store.getAllUsers();

      expect(allUsers.length).toBe(2);
      expect(allUsers.some(u => u.id === 'user-1')).toBe(true);
      expect(allUsers.some(u => u.id === 'user-2')).toBe(true);
    });
  });

  describe('Cascade Deletion', () => {
    it('should delete user and all related data', async () => {
      const user: UserProfile = {
        id: 'delete-user',
        email: 'delete@example.com',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: ['tech'],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      // Create related data
      const scenario: Scenario = { description: 'Test' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      const history: AdviceHistory = {
        id: 'history-1',
        userId: user.id,
        timestamp: new Date(),
        scenario,
        matchedVibes: [],
        advice,
        regionFilterApplied: undefined,
        interestBoostsApplied: [],
      };

      await store.saveAdviceHistory(history);

      const favorite: UserFavorite = {
        id: 'favorite-1',
        userId: user.id,
        type: 'advice',
        referenceId: 'history-1',
        timestamp: new Date(),
      };

      await store.saveFavorite(favorite);

      // Verify data exists
      let retrievedUser = await store.getUser(user.id);
      let retrievedHistory = await store.getAdviceHistory(user.id);
      let retrievedFavorites = await store.getFavorites(user.id);

      expect(retrievedUser).toBeDefined();
      expect(retrievedHistory.length).toBe(1);
      expect(retrievedFavorites.length).toBe(1);

      // Delete user
      await store.deleteUser(user.id);

      // Verify all data is deleted
      retrievedUser = await store.getUser(user.id);
      retrievedHistory = await store.getAdviceHistory(user.id);
      retrievedFavorites = await store.getFavorites(user.id);

      expect(retrievedUser).toBeNull();
      expect(retrievedHistory.length).toBe(0);
      expect(retrievedFavorites.length).toBe(0);
    });

    it('should not affect other users when deleting one user', async () => {
      const user1: UserProfile = {
        id: 'keep-user',
        email: 'keep@example.com',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      const user2: UserProfile = {
        id: 'delete-user-2',
        email: 'delete2@example.com',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user1);
      await store.saveUser(user2);

      // Create data for both users
      const scenario: Scenario = { description: 'Test' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      const history1: AdviceHistory = {
        id: 'history-user1',
        userId: user1.id,
        timestamp: new Date(),
        scenario,
        matchedVibes: [],
        advice,
        regionFilterApplied: undefined,
        interestBoostsApplied: [],
      };

      const history2: AdviceHistory = {
        id: 'history-user2',
        userId: user2.id,
        timestamp: new Date(),
        scenario,
        matchedVibes: [],
        advice,
        regionFilterApplied: undefined,
        interestBoostsApplied: [],
      };

      await store.saveAdviceHistory(history1);
      await store.saveAdviceHistory(history2);

      // Delete user2
      await store.deleteUser(user2.id);

      // Verify user1 and their data still exists
      const retrievedUser1 = await store.getUser(user1.id);
      const retrievedHistory1 = await store.getAdviceHistory(user1.id);

      expect(retrievedUser1).toBeDefined();
      expect(retrievedHistory1.length).toBe(1);

      // Verify user2 and their data is gone
      const retrievedUser2 = await store.getUser(user2.id);
      const retrievedHistory2 = await store.getAdviceHistory(user2.id);

      expect(retrievedUser2).toBeNull();
      expect(retrievedHistory2.length).toBe(0);
    });
  });

  describe('Monthly Query Reset', () => {
    it('should reset query counts on first of month', async () => {
      const users: UserProfile[] = [
        {
          id: 'reset-user-1',
          email: 'reset1@example.com',
          tier: 'free',
          queriesThisMonth: 5,
          queryLimit: 5,
          interests: [],
          avoidTopics: [],
          conversationStyle: 'casual',
          emailNotifications: true,
          shareDataForResearch: false,
          createdAt: new Date(),
          lastActive: new Date(),
          onboardingCompleted: true,
        },
        {
          id: 'reset-user-2',
          email: 'reset2@example.com',
          tier: 'regular',
          queriesThisMonth: 75,
          queryLimit: 100,
          interests: [],
          avoidTopics: [],
          conversationStyle: 'casual',
          emailNotifications: true,
          shareDataForResearch: false,
          createdAt: new Date(),
          lastActive: new Date(),
          onboardingCompleted: true,
        },
      ];

      for (const user of users) {
        await store.saveUser(user);
      }

      // Reset all query counts
      await store.resetMonthlyQueries();

      // Verify all counts are reset
      for (const user of users) {
        const retrieved = await store.getUser(user.id);
        expect(retrieved?.queriesThisMonth).toBe(0);
        expect(retrieved?.queryLimit).toBe(user.queryLimit); // Limit unchanged
      }
    });

    it('should not affect query limits during reset', async () => {
      const user: UserProfile = {
        id: 'limit-user',
        email: 'limit@example.com',
        tier: 'light',
        queriesThisMonth: 20,
        queryLimit: 25,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      await store.resetMonthlyQueries();

      const retrieved = await store.getUser(user.id);

      expect(retrieved?.queriesThisMonth).toBe(0);
      expect(retrieved?.queryLimit).toBe(25);
      expect(retrieved?.tier).toBe('light');
    });
  });

  describe('Usage Metrics Aggregation', () => {
    it('should aggregate metrics correctly', async () => {
      const user: UserProfile = {
        id: 'metrics-user',
        email: 'metrics@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        region: 'US-West',
        interests: ['tech', 'fashion'],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      const scenario: Scenario = { description: 'Test' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      // Create multiple history items
      const ratings = [5, 4, 5];
      for (let i = 0; i < ratings.length; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: user.id,
          timestamp: new Date(),
          scenario,
          matchedVibes: [],
          advice,
          rating: ratings[i] as 1 | 2 | 3 | 4 | 5,
          regionFilterApplied: 'US-West',
          interestBoostsApplied: ['tech', 'fashion'],
        };

        await store.saveAdviceHistory(history);
      }

      // Save metrics
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      await store.saveUsageMetrics({
        userId: user.id,
        month,
        queriesCount: 3,
        topRegionsQueried: { 'US-West': 3 },
        topInterestMatches: { tech: 3, fashion: 3 },
        averageRating: 4.67,
      });

      const metrics = await store.getUsageMetrics(user.id, month);

      expect(metrics).toBeDefined();
      expect(metrics?.queriesCount).toBe(3);
      expect(metrics?.topRegionsQueried['US-West']).toBe(3);
      expect(metrics?.topInterestMatches['tech']).toBe(3);
      expect(metrics?.averageRating).toBeCloseTo(4.67, 1);
    });

    it('should handle multiple months of metrics', async () => {
      const user: UserProfile = {
        id: 'multi-month-user',
        email: 'multimonth@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      // Save metrics for different months
      const months = ['2025-01', '2025-02', '2025-03'];
      for (let i = 0; i < months.length; i++) {
        await store.saveUsageMetrics({
          userId: user.id,
          month: months[i],
          queriesCount: (i + 1) * 10,
          topRegionsQueried: {},
          topInterestMatches: {},
          averageRating: 4.0,
        });
      }

      // Retrieve each month
      for (let i = 0; i < months.length; i++) {
        const metrics = await store.getUsageMetrics(user.id, months[i]);
        expect(metrics?.queriesCount).toBe((i + 1) * 10);
      }
    });

    it('should return null for months with no metrics', async () => {
      const user: UserProfile = {
        id: 'no-metrics-user',
        email: 'nometrics@example.com',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      const metrics = await store.getUsageMetrics(user.id, '2024-01');
      expect(metrics).toBeNull();
    });
  });

  describe('History and Favorites Storage', () => {
    it('should store and retrieve advice history', async () => {
      const user: UserProfile = {
        id: 'history-storage-user',
        email: 'historystorage@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test reasoning',
        confidence: 0.9,
        timestamp: new Date(),
      };

      const history: AdviceHistory = {
        id: 'stored-history',
        userId: user.id,
        timestamp: new Date(),
        scenario,
        matchedVibes: ['vibe-1', 'vibe-2'],
        advice,
        rating: 5,
        feedback: 'Great advice!',
        wasHelpful: true,
        regionFilterApplied: 'US-West',
        interestBoostsApplied: ['tech'],
      };

      await store.saveAdviceHistory(history);

      const retrieved = await store.getAdviceHistory(user.id);

      expect(retrieved.length).toBe(1);
      expect(retrieved[0].id).toBe('stored-history');
      expect(retrieved[0].rating).toBe(5);
      expect(retrieved[0].feedback).toBe('Great advice!');
      expect(retrieved[0].wasHelpful).toBe(true);
    });

    it('should store and retrieve favorites', async () => {
      const user: UserProfile = {
        id: 'favorites-user',
        email: 'favorites@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      const favorites: UserFavorite[] = [
        {
          id: 'fav-1',
          userId: user.id,
          type: 'advice',
          referenceId: 'advice-1',
          timestamp: new Date(),
          note: 'Very helpful',
        },
        {
          id: 'fav-2',
          userId: user.id,
          type: 'vibe',
          referenceId: 'vibe-1',
          timestamp: new Date(),
        },
      ];

      for (const fav of favorites) {
        await store.saveFavorite(fav);
      }

      const retrieved = await store.getFavorites(user.id);

      expect(retrieved.length).toBe(2);
      expect(retrieved.some(f => f.type === 'advice')).toBe(true);
      expect(retrieved.some(f => f.type === 'vibe')).toBe(true);
    });

    it('should delete favorites', async () => {
      const user: UserProfile = {
        id: 'delete-fav-user',
        email: 'deletefav@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      await store.saveUser(user);

      const favorite: UserFavorite = {
        id: 'fav-delete',
        userId: user.id,
        type: 'advice',
        referenceId: 'advice-1',
        timestamp: new Date(),
      };

      await store.saveFavorite(favorite);

      let favorites = await store.getFavorites(user.id);
      expect(favorites.length).toBe(1);

      await store.deleteFavorite('fav-delete', user.id);

      favorites = await store.getFavorites(user.id);
      expect(favorites.length).toBe(0);
    });
  });

  describe('Query Performance', () => {
    it('should handle large numbers of users efficiently', async () => {
      const startTime = Date.now();

      // Create 100 users
      const users: UserProfile[] = [];
      for (let i = 0; i < 100; i++) {
        users.push({
          id: `perf-user-${i}`,
          email: `perf${i}@example.com`,
          tier: i % 4 === 0 ? 'free' : i % 4 === 1 ? 'light' : i % 4 === 2 ? 'regular' : 'unlimited',
          queriesThisMonth: i,
          queryLimit: i % 4 === 0 ? 5 : i % 4 === 1 ? 25 : i % 4 === 2 ? 100 : Infinity,
          interests: [],
          avoidTopics: [],
          conversationStyle: 'casual',
          emailNotifications: true,
          shareDataForResearch: false,
          createdAt: new Date(),
          lastActive: new Date(),
          onboardingCompleted: true,
        });
      }

      for (const user of users) {
        await store.saveUser(user);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 1 second for memory store)
      expect(duration).toBeLessThan(1000);

      // Verify all users are stored
      const allUsers = await store.getAllUsers();
      expect(allUsers.length).toBe(100);
    });
  });
});
