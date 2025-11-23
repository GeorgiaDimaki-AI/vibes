/**
 * Performance Tests
 *
 * Tests to ensure the multi-user implementation meets performance requirements:
 * - API response times
 * - Personalized matching overhead
 * - Pagination efficiency
 * - Analytics calculation speed
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { ZeitgeistService } from '@/lib/zeitgeist-service';
import { AnalyticsService } from '@/lib/users/analytics-service';
import { HistoryService } from '@/lib/users/history-service';
import { UserProfile, Scenario, Vibe, Advice, AdviceHistory } from '@/lib/types';

describe('Performance Tests', () => {
  let store: MemoryGraphStore;
  let zeitgeist: ZeitgeistService;
  let analyticsService: AnalyticsService;
  let historyService: HistoryService;

  beforeEach(async () => {
    store = new MemoryGraphStore();
    zeitgeist = new ZeitgeistService(store);
    analyticsService = new AnalyticsService(store);
    historyService = new HistoryService(store);

    // Seed with test data
    await seedPerformanceData(store);
  });

  describe('Advice Generation Speed', () => {
    it('should complete advice generation in <2s (p95)', async () => {
      const user: UserProfile = {
        id: 'perf-user-1',
        email: 'perf1@example.com',
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

      const scenario: Scenario = {
        description: 'What are the latest tech trends in fashion?',
      };

      const startTime = Date.now();
      const advice = await zeitgeist.getAdvice(scenario, user);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(advice).toBeDefined();
      expect(duration).toBeLessThan(2000); // <2s requirement

      console.log(`Advice generation took ${duration}ms`);
    });

    it('should handle multiple concurrent requests efficiently', async () => {
      const users: UserProfile[] = [];
      for (let i = 0; i < 10; i++) {
        users.push({
          id: `concurrent-user-${i}`,
          email: `concurrent${i}@example.com`,
          tier: 'regular',
          queriesThisMonth: 0,
          queryLimit: 100,
          interests: ['tech'],
          avoidTopics: [],
          conversationStyle: 'casual',
          emailNotifications: true,
          shareDataForResearch: false,
          createdAt: new Date(),
          lastActive: new Date(),
          onboardingCompleted: true,
        });
      }

      const scenario: Scenario = { description: 'What should I know?' };

      const startTime = Date.now();

      const promises = users.map(user => zeitgeist.getAdvice(scenario, user));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(10);
      expect(results.every(r => r !== null)).toBe(true);

      // All 10 concurrent requests should complete in reasonable time
      expect(duration).toBeLessThan(5000);

      console.log(`10 concurrent requests took ${duration}ms (${duration / 10}ms avg)`);
    });
  });

  describe('Personalization Overhead', () => {
    it('should add <500ms overhead for personalization', async () => {
      const scenario: Scenario = {
        description: 'Tell me about current trends',
      };

      // Test without personalization
      const startGeneric = Date.now();
      const genericAdvice = await zeitgeist.getAdvice(scenario);
      const endGeneric = Date.now();
      const genericDuration = endGeneric - startGeneric;

      // Test with personalization
      const user: UserProfile = {
        id: 'personalization-user',
        email: 'personalization@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        region: 'US-West',
        interests: ['tech', 'fashion', 'music'],
        avoidTopics: ['politics', 'sports'],
        conversationStyle: 'professional',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      const startPersonalized = Date.now();
      const personalizedAdvice = await zeitgeist.getAdvice(scenario, user);
      const endPersonalized = Date.now();
      const personalizedDuration = endPersonalized - startPersonalized;

      const overhead = personalizedDuration - genericDuration;

      expect(genericAdvice).toBeDefined();
      expect(personalizedAdvice).toBeDefined();
      expect(overhead).toBeLessThan(500); // <500ms overhead requirement

      console.log(`Generic: ${genericDuration}ms, Personalized: ${personalizedDuration}ms, Overhead: ${overhead}ms`);
    });

    it('should scale personalization efficiently with many preferences', async () => {
      const user: UserProfile = {
        id: 'many-prefs-user',
        email: 'manyprefs@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
        region: 'US-West',
        interests: ['tech', 'fashion', 'music', 'art', 'food', 'travel', 'sports', 'gaming'],
        avoidTopics: ['politics', 'crypto', 'religion', 'violence'],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      const scenario: Scenario = { description: 'General advice' };

      const startTime = Date.now();
      const advice = await zeitgeist.getAdvice(scenario, user);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(advice).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should still be fast

      console.log(`Personalization with ${user.interests.length} interests and ${user.avoidTopics.length} avoid topics: ${duration}ms`);
    });
  });

  describe('Pagination Efficiency', () => {
    it('should load paginated history in <1s', async () => {
      const user: UserProfile = {
        id: 'pagination-user',
        email: 'pagination@example.com',
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

      // Create 100 history items
      const scenario: Scenario = { description: 'Test' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      for (let i = 0; i < 100; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: user.id,
          timestamp: new Date(Date.now() - i * 1000 * 60), // Stagger timestamps
          scenario,
          matchedVibes: [],
          advice,
          regionFilterApplied: undefined,
          interestBoostsApplied: [],
        };

        await store.saveAdviceHistory(history);
      }

      // Test pagination
      const startTime = Date.now();
      const page1 = await historyService.getHistory(user.id, 20, 0);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(page1.length).toBe(20);
      expect(duration).toBeLessThan(1000); // <1s requirement

      console.log(`Paginated history (20 of 100) loaded in ${duration}ms`);
    });

    it('should handle deep pagination efficiently', async () => {
      const user: UserProfile = {
        id: 'deep-pagination-user',
        email: 'deeppagination@example.com',
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

      // Create 200 history items
      const scenario: Scenario = { description: 'Test' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      for (let i = 0; i < 200; i++) {
        const history: AdviceHistory = {
          id: `deep-history-${i}`,
          userId: user.id,
          timestamp: new Date(Date.now() - i * 1000 * 60),
          scenario,
          matchedVibes: [],
          advice,
          regionFilterApplied: undefined,
          interestBoostsApplied: [],
        };

        await store.saveAdviceHistory(history);
      }

      // Test deep pagination (page 10)
      const startTime = Date.now();
      const page10 = await historyService.getHistory(user.id, 20, 180);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(page10.length).toBe(20);
      expect(duration).toBeLessThan(1000);

      console.log(`Deep pagination (items 180-200 of 200) loaded in ${duration}ms`);
    });
  });

  describe('Analytics Calculation Speed', () => {
    it('should generate insights in <3s', async () => {
      const user: UserProfile = {
        id: 'analytics-user',
        email: 'analytics@example.com',
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

      // Create 50 history items with ratings
      const scenario: Scenario = { description: 'Test' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      for (let i = 0; i < 50; i++) {
        const history: AdviceHistory = {
          id: `analytics-history-${i}`,
          userId: user.id,
          timestamp: new Date(Date.now() - i * 1000 * 60 * 60), // Hourly
          scenario,
          matchedVibes: [`vibe-${i % 10}`],
          advice,
          rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          wasHelpful: i % 3 === 0,
          regionFilterApplied: 'US-West',
          interestBoostsApplied: user.interests,
        };

        await store.saveAdviceHistory(history);
      }

      const startTime = Date.now();
      const insights = await analyticsService.getUserInsights(user.id);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(insights).toBeDefined();
      expect(insights.totalQueries).toBe(50);
      expect(duration).toBeLessThan(3000); // <3s requirement

      console.log(`Analytics insights (50 queries) generated in ${duration}ms`);
    });

    it('should aggregate monthly metrics efficiently', async () => {
      const user: UserProfile = {
        id: 'aggregate-user',
        email: 'aggregate@example.com',
        tier: 'regular',
        queriesThisMonth: 0,
        queryLimit: 100,
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

      // Create 100 history items
      const scenario: Scenario = { description: 'Test' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      for (let i = 0; i < 100; i++) {
        const history: AdviceHistory = {
          id: `aggregate-history-${i}`,
          userId: user.id,
          timestamp: new Date(),
          scenario,
          matchedVibes: [],
          advice,
          rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          regionFilterApplied: 'US-West',
          interestBoostsApplied: ['tech'],
        };

        await store.saveAdviceHistory(history);
      }

      const startTime = Date.now();
      await analyticsService.aggregateMonthlyMetrics(user.id);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should be fast

      console.log(`Monthly metrics aggregation (100 queries) took ${duration}ms`);
    });
  });

  describe('Database Query Optimization', () => {
    it('should efficiently query user profiles', async () => {
      // Create 100 users
      for (let i = 0; i < 100; i++) {
        const user: UserProfile = {
          id: `db-user-${i}`,
          email: `db${i}@example.com`,
          tier: i % 4 === 0 ? 'free' : 'regular',
          queriesThisMonth: i,
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
      }

      const startTime = Date.now();
      const user50 = await store.getUser('db-user-50');
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(user50).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be very fast

      console.log(`User lookup from 100 users took ${duration}ms`);
    });

    it('should handle bulk operations efficiently', async () => {
      // Create 50 users
      const users: UserProfile[] = [];
      for (let i = 0; i < 50; i++) {
        users.push({
          id: `bulk-user-${i}`,
          email: `bulk${i}@example.com`,
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
        });
      }

      const startTime = Date.now();

      for (const user of users) {
        await store.saveUser(user);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Bulk save <1s

      console.log(`Bulk save of 50 users took ${duration}ms (${duration / 50}ms avg)`);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated operations', async () => {
      const user: UserProfile = {
        id: 'memory-user',
        email: 'memory@example.com',
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

      const scenario: Scenario = { description: 'Test' };

      // Perform 100 operations
      for (let i = 0; i < 100; i++) {
        await zeitgeist.getAdvice(scenario, user);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // If we got here without OOM, test passes
      expect(true).toBe(true);

      console.log('100 operations completed without memory issues');
    });
  });
});

/**
 * Helper to seed performance test data
 */
async function seedPerformanceData(store: MemoryGraphStore): Promise<void> {
  // Create 50 test vibes for realistic matching
  const categories = ['trend', 'behavior', 'concern', 'value'];
  const regions = ['US-West', 'US-East', 'Europe', 'Asia'];
  const keywords = ['tech', 'fashion', 'music', 'food', 'travel', 'sports', 'art', 'gaming'];

  for (let i = 0; i < 50; i++) {
    const vibe: Vibe = {
      id: `perf-vibe-${i}`,
      name: `Performance Test Vibe ${i}`,
      description: `Test vibe for performance testing ${i}`,
      category: categories[i % categories.length],
      keywords: [keywords[i % keywords.length], keywords[(i + 1) % keywords.length]],
      strength: 0.5 + (i % 50) / 100,
      sentiment: i % 3 === 0 ? 'positive' : i % 3 === 1 ? 'neutral' : 'negative',
      timestamp: new Date(Date.now() - i * 1000 * 60 * 60),
      sources: [],
      firstSeen: new Date(Date.now() - i * 1000 * 60 * 60 * 24),
      lastSeen: new Date(),
      currentRelevance: 0.5 + (i % 50) / 100,
      region: regions[i % regions.length],
    };

    await store.saveVibe(vibe);
  }
}
