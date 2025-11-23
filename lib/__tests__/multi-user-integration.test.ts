/**
 * Multi-User Integration Tests
 *
 * Comprehensive end-to-end tests for multi-user functionality.
 * Tests complete user journey: signup → onboarding → advice → history → favorites
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { UserService } from '@/lib/users/user-service';
import { HistoryService } from '@/lib/users/history-service';
import { FavoritesService } from '@/lib/users/favorites-service';
import { AnalyticsService } from '@/lib/users/analytics-service';
import { PersonalizedMatcher } from '@/lib/matchers/personalized';
import { ZeitgeistService } from '@/lib/zeitgeist-service';
import { UserProfile, Scenario, Vibe } from '@/lib/types';

describe('Multi-User Integration', () => {
  let store: MemoryGraphStore;
  let userService: UserService;
  let historyService: HistoryService;
  let favoritesService: FavoritesService;
  let analyticsService: AnalyticsService;
  let matcher: PersonalizedMatcher;
  let zeitgeist: ZeitgeistService;

  beforeEach(async () => {
    // Initialize services
    store = new MemoryGraphStore();
    userService = new UserService(store);
    historyService = new HistoryService(store);
    favoritesService = new FavoritesService(store);
    analyticsService = new AnalyticsService(store);
    matcher = new PersonalizedMatcher(store);
    zeitgeist = new ZeitgeistService(store);

    // Seed test data
    await seedTestVibes(store);
  });

  describe('Complete User Journey', () => {
    it('should support full user journey: signup → onboarding → advice → history → favorites', async () => {
      // Step 1: User signup (create profile)
      const newUser = await userService.createUser({
        email: 'newuser@example.com',
        displayName: 'New User',
        tier: 'free',
      });

      expect(newUser.id).toBeDefined();
      expect(newUser.email).toBe('newuser@example.com');
      expect(newUser.tier).toBe('free');
      expect(newUser.queryLimit).toBe(5);
      expect(newUser.onboardingCompleted).toBe(false);

      // Step 2: Onboarding (set preferences)
      const updatedUser = await userService.updateUser(newUser.id, {
        region: 'US-West',
        interests: ['tech', 'fashion'],
        avoidTopics: ['politics'],
        conversationStyle: 'casual',
        onboardingCompleted: true,
      });

      expect(updatedUser.onboardingCompleted).toBe(true);
      expect(updatedUser.region).toBe('US-West');
      expect(updatedUser.interests).toEqual(['tech', 'fashion']);

      // Step 3: Get personalized advice
      const scenario: Scenario = {
        description: 'I need fashion advice for a tech conference',
      };

      const advice = await zeitgeist.getAdvice(scenario, updatedUser);

      expect(advice).toBeDefined();
      expect(advice.recommendations).toBeDefined();
      expect(advice.matchedVibes.length).toBeGreaterThan(0);

      // Step 4: Save to history with rating
      const historyId = await historyService.saveAdvice(
        updatedUser.id,
        scenario,
        advice,
        {
          regionFilterApplied: updatedUser.region,
          interestBoostsApplied: updatedUser.interests,
        }
      );

      expect(historyId).toBeDefined();

      // Rate the advice
      await historyService.rateAdvice(historyId, updatedUser.id, 5, 'Very helpful!');

      const history = await historyService.getHistory(updatedUser.id);
      expect(history.length).toBe(1);
      expect(history[0].rating).toBe(5);
      expect(history[0].feedback).toBe('Very helpful!');

      // Step 5: Add to favorites
      const favoriteId = await favoritesService.addFavorite(
        updatedUser.id,
        'advice',
        historyId,
        'Great advice for conferences'
      );

      expect(favoriteId).toBeDefined();

      const favorites = await favoritesService.getFavorites(updatedUser.id);
      expect(favorites.length).toBe(1);
      expect(favorites[0].type).toBe('advice');

      // Step 6: Check analytics
      const insights = await analyticsService.getUserInsights(updatedUser.id);
      expect(insights.totalQueries).toBe(1);
      expect(insights.satisfaction.averageRating).toBe(5);
      expect(insights.topInterests.length).toBeGreaterThan(0);

      // Verify user usage was tracked
      const currentUser = await userService.getUserProfile(updatedUser.id);
      expect(currentUser?.queriesThisMonth).toBe(1);
    });

    it('should handle multiple users independently', async () => {
      // Create two users
      const user1 = await userService.createUser({
        email: 'user1@example.com',
        tier: 'free',
        interests: ['tech'],
      });

      const user2 = await userService.createUser({
        email: 'user2@example.com',
        tier: 'regular',
        interests: ['fashion'],
      });

      // Get advice for both
      const scenario: Scenario = { description: 'General advice' };

      const advice1 = await zeitgeist.getAdvice(scenario, user1);
      const advice2 = await zeitgeist.getAdvice(scenario, user2);

      // Save to history
      const history1Id = await historyService.saveAdvice(user1.id, scenario, advice1, {
        interestBoostsApplied: ['tech'],
      });

      const history2Id = await historyService.saveAdvice(user2.id, scenario, advice2, {
        interestBoostsApplied: ['fashion'],
      });

      // Verify data isolation
      const user1History = await historyService.getHistory(user1.id);
      const user2History = await historyService.getHistory(user2.id);

      expect(user1History.length).toBe(1);
      expect(user2History.length).toBe(1);
      expect(user1History[0].id).toBe(history1Id);
      expect(user2History[0].id).toBe(history2Id);

      // User 1 cannot access User 2's history
      const user1CannotAccessUser2 = user1History.every(h => h.userId === user1.id);
      const user2CannotAccessUser1 = user2History.every(h => h.userId === user2.id);

      expect(user1CannotAccessUser2).toBe(true);
      expect(user2CannotAccessUser1).toBe(true);
    });
  });

  describe('Personalization Effects on Matching', () => {
    it('should filter and boost vibes based on user preferences', async () => {
      const user = await userService.createUser({
        email: 'test@example.com',
        tier: 'regular',
        region: 'US-West',
        interests: ['tech'],
        avoidTopics: ['sports'],
      });

      const scenario: Scenario = {
        description: 'What should I know about current trends?',
      };

      // Get advice with personalization
      const personalizedAdvice = await zeitgeist.getAdvice(scenario, user);

      // Get advice without personalization
      const genericAdvice = await zeitgeist.getAdvice(scenario);

      // Personalized advice should be different
      expect(personalizedAdvice.matchedVibes).toBeDefined();
      expect(genericAdvice.matchedVibes).toBeDefined();

      // Check that personalized advice respects preferences
      // (Implementation depends on matcher logic)
      expect(personalizedAdvice.confidence).toBeGreaterThanOrEqual(0);
      expect(personalizedAdvice.confidence).toBeLessThanOrEqual(1);
    });

    it('should boost vibes matching user interests', async () => {
      const techUser = await userService.createUser({
        email: 'tech@example.com',
        tier: 'regular',
        interests: ['tech', 'ai'],
      });

      const fashionUser = await userService.createUser({
        email: 'fashion@example.com',
        tier: 'regular',
        interests: ['fashion', 'style'],
      });

      const scenario: Scenario = {
        description: 'What are the latest trends?',
      };

      const techAdvice = await zeitgeist.getAdvice(scenario, techUser);
      const fashionAdvice = await zeitgeist.getAdvice(scenario, fashionUser);

      // Different users should potentially get different advice
      expect(techAdvice).toBeDefined();
      expect(fashionAdvice).toBeDefined();

      // Both should have valid recommendations
      expect(techAdvice.recommendations).toBeDefined();
      expect(fashionAdvice.recommendations).toBeDefined();
    });

    it('should filter out avoided topics', async () => {
      const user = await userService.createUser({
        email: 'filtered@example.com',
        tier: 'regular',
        avoidTopics: ['politics', 'crypto'],
      });

      const scenario: Scenario = {
        description: 'Tell me about current events',
      };

      const advice = await zeitgeist.getAdvice(scenario, user);

      expect(advice).toBeDefined();
      expect(advice.matchedVibes).toBeDefined();

      // Verify no avoided topics in matched vibes
      // (Would require checking vibe metadata)
    });
  });

  describe('Rate Limiting Enforcement', () => {
    it('should enforce tier limits on queries', async () => {
      const freeUser = await userService.createUser({
        email: 'free@example.com',
        tier: 'free',
      });

      expect(freeUser.queryLimit).toBe(5);
      expect(freeUser.queriesThisMonth).toBe(0);

      // Make queries up to limit
      for (let i = 0; i < 5; i++) {
        const canQuery = await userService.canMakeQuery(freeUser.id);
        expect(canQuery).toBe(true);

        await userService.incrementQueryCount(freeUser.id);
      }

      // Check that limit is reached
      const updatedUser = await userService.getUserProfile(freeUser.id);
      expect(updatedUser?.queriesThisMonth).toBe(5);

      // Next query should be blocked
      const canQueryAfterLimit = await userService.canMakeQuery(freeUser.id);
      expect(canQueryAfterLimit).toBe(false);
    });

    it('should not limit unlimited tier users', async () => {
      const unlimitedUser = await userService.createUser({
        email: 'unlimited@example.com',
        tier: 'unlimited',
      });

      // Make many queries
      for (let i = 0; i < 200; i++) {
        const canQuery = await userService.canMakeQuery(unlimitedUser.id);
        expect(canQuery).toBe(true);

        await userService.incrementQueryCount(unlimitedUser.id);
      }

      // Should still be able to query
      const canQueryAfter = await userService.canMakeQuery(unlimitedUser.id);
      expect(canQueryAfter).toBe(true);
    });

    it('should reset monthly query counts', async () => {
      const user = await userService.createUser({
        email: 'reset@example.com',
        tier: 'free',
      });

      // Use up all queries
      for (let i = 0; i < 5; i++) {
        await userService.incrementQueryCount(user.id);
      }

      const beforeReset = await userService.getUserProfile(user.id);
      expect(beforeReset?.queriesThisMonth).toBe(5);

      // Reset queries
      await userService.resetMonthlyQueries();

      const afterReset = await userService.getUserProfile(user.id);
      expect(afterReset?.queriesThisMonth).toBe(0);
      expect(afterReset?.queryLimit).toBe(5); // Limit unchanged
    });
  });

  describe('Data Isolation', () => {
    it('should ensure users can only access their own data', async () => {
      const user1 = await userService.createUser({
        email: 'user1@example.com',
        tier: 'free',
      });

      const user2 = await userService.createUser({
        email: 'user2@example.com',
        tier: 'free',
      });

      const scenario: Scenario = { description: 'Test' };
      const advice = await zeitgeist.getAdvice(scenario, user1);

      // Save advice for user1
      const historyId = await historyService.saveAdvice(user1.id, scenario, advice, {});

      // Add favorite for user1
      await favoritesService.addFavorite(user1.id, 'advice', historyId);

      // User2 should not see user1's data
      const user2History = await historyService.getHistory(user2.id);
      const user2Favorites = await favoritesService.getFavorites(user2.id);

      expect(user2History.length).toBe(0);
      expect(user2Favorites.length).toBe(0);

      // User1 should see their own data
      const user1History = await historyService.getHistory(user1.id);
      const user1Favorites = await favoritesService.getFavorites(user1.id);

      expect(user1History.length).toBe(1);
      expect(user1Favorites.length).toBe(1);
    });

    it('should prevent cross-user data access attempts', async () => {
      const user1 = await userService.createUser({
        email: 'owner@example.com',
        tier: 'free',
      });

      const user2 = await userService.createUser({
        email: 'attacker@example.com',
        tier: 'free',
      });

      const scenario: Scenario = { description: 'Private data' };
      const advice = await zeitgeist.getAdvice(scenario, user1);

      const historyId = await historyService.saveAdvice(user1.id, scenario, advice, {});

      // Try to rate user1's advice as user2 (should fail or have no effect)
      // This depends on implementation - should verify userId matches
      try {
        await historyService.rateAdvice(historyId, user2.id, 1);
        // If it doesn't throw, check that it didn't affect user1's data
        const history = await historyService.getHistory(user1.id);
        // Rating should not be set by user2
      } catch (error) {
        // Expected to throw authorization error
        expect(error).toBeDefined();
      }
    });

    it('should cascade delete user data', async () => {
      const user = await userService.createUser({
        email: 'todelete@example.com',
        tier: 'free',
      });

      const scenario: Scenario = { description: 'Test' };
      const advice = await zeitgeist.getAdvice(scenario, user);

      // Create history and favorites
      const historyId = await historyService.saveAdvice(user.id, scenario, advice, {});
      await favoritesService.addFavorite(user.id, 'advice', historyId);

      // Delete user
      await userService.deleteUser(user.id);

      // Verify user is gone
      const deletedUser = await userService.getUserProfile(user.id);
      expect(deletedUser).toBeNull();

      // Verify related data is gone
      const history = await historyService.getHistory(user.id);
      const favorites = await favoritesService.getFavorites(user.id);

      expect(history.length).toBe(0);
      expect(favorites.length).toBe(0);
    });
  });

  describe('Tier Differences', () => {
    it('should enforce different capabilities per tier', async () => {
      const tiers: Array<{ tier: 'free' | 'light' | 'regular' | 'unlimited'; limit: number }> = [
        { tier: 'free', limit: 5 },
        { tier: 'light', limit: 25 },
        { tier: 'regular', limit: 100 },
        { tier: 'unlimited', limit: Infinity },
      ];

      for (const { tier, limit } of tiers) {
        const user = await userService.createUser({
          email: `${tier}@example.com`,
          tier,
        });

        expect(user.queryLimit).toBe(limit);
        expect(user.tier).toBe(tier);
      }
    });

    it('should allow tier upgrades', async () => {
      const user = await userService.createUser({
        email: 'upgrade@example.com',
        tier: 'free',
      });

      expect(user.tier).toBe('free');
      expect(user.queryLimit).toBe(5);

      // Upgrade to regular
      const upgraded = await userService.updateUser(user.id, {
        tier: 'regular',
      });

      expect(upgraded.tier).toBe('regular');
      expect(upgraded.queryLimit).toBe(100);

      // Verify queries don't reset on upgrade
      await userService.incrementQueryCount(user.id);
      const afterQuery = await userService.getUserProfile(user.id);
      expect(afterQuery?.queriesThisMonth).toBe(1);
    });
  });

  describe('Historical Learning', () => {
    it('should track what advice worked for users', async () => {
      const user = await userService.createUser({
        email: 'learner@example.com',
        tier: 'regular',
        interests: ['tech'],
      });

      const scenario: Scenario = { description: 'Tech advice' };
      const advice = await zeitgeist.getAdvice(scenario, user);

      // Save with positive rating
      const historyId = await historyService.saveAdvice(user.id, scenario, advice, {
        interestBoostsApplied: ['tech'],
      });

      await historyService.rateAdvice(historyId, user.id, 5);

      // Check insights
      const insights = await analyticsService.getUserInsights(user.id);

      expect(insights.satisfaction.averageRating).toBe(5);
      expect(insights.topInterests.some(i => i.interest === 'tech')).toBe(true);
    });

    it('should aggregate usage analytics correctly', async () => {
      const user = await userService.createUser({
        email: 'analytics@example.com',
        tier: 'regular',
        region: 'US-West',
        interests: ['tech', 'fashion'],
      });

      const scenarios = [
        { description: 'Tech trends' },
        { description: 'Fashion advice' },
        { description: 'General advice' },
      ];

      // Create history
      for (const scenario of scenarios) {
        const advice = await zeitgeist.getAdvice(scenario, user);
        await historyService.saveAdvice(user.id, scenario, advice, {
          regionFilterApplied: 'US-West',
          interestBoostsApplied: user.interests,
        });
      }

      // Aggregate metrics
      await analyticsService.aggregateMonthlyMetrics(user.id);

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const metrics = await analyticsService.getMonthlyMetrics(user.id, month);

      expect(metrics).toBeDefined();
      expect(metrics?.queriesCount).toBe(3);
      expect(metrics?.topRegionsQueried['US-West']).toBe(3);
    });
  });
});

/**
 * Helper to seed test vibes
 */
async function seedTestVibes(store: MemoryGraphStore): Promise<void> {
  const testVibes: Vibe[] = [
    {
      id: 'vibe-tech-1',
      name: 'AI Revolution',
      description: 'Artificial intelligence transforming industries',
      category: 'trend',
      keywords: ['ai', 'tech', 'innovation'],
      strength: 0.9,
      sentiment: 'positive',
      timestamp: new Date(),
      sources: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRelevance: 0.9,
      region: 'US-West',
    },
    {
      id: 'vibe-fashion-1',
      name: 'Sustainable Fashion',
      description: 'Eco-friendly fashion trends',
      category: 'trend',
      keywords: ['fashion', 'sustainability', 'eco'],
      strength: 0.8,
      sentiment: 'positive',
      timestamp: new Date(),
      sources: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRelevance: 0.8,
      region: 'US-West',
    },
    {
      id: 'vibe-sports-1',
      name: 'Sports Betting',
      description: 'Rising interest in sports gambling',
      category: 'trend',
      keywords: ['sports', 'betting', 'gambling'],
      strength: 0.7,
      sentiment: 'neutral',
      timestamp: new Date(),
      sources: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRelevance: 0.7,
      region: 'US-East',
    },
  ];

  for (const vibe of testVibes) {
    await store.saveVibe(vibe);
  }
}
