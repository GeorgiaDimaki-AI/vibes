/**
 * Analytics Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AnalyticsService } from '../analytics-service';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { UserProfile, AdviceHistory, Scenario, Advice, Vibe } from '@/lib/types';

describe('AnalyticsService', () => {
  let store: MemoryGraphStore;
  let service: AnalyticsService;
  let testUser: UserProfile;

  beforeEach(async () => {
    store = new MemoryGraphStore();
    service = new AnalyticsService(store);

    // Create test user
    testUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      tier: 'regular',
      queriesThisMonth: 0,
      queryLimit: 100,
      interests: ['tech', 'fashion'],
      avoidTopics: [],
      conversationStyle: 'casual',
      emailNotifications: true,
      shareDataForResearch: false,
      createdAt: new Date('2025-01-01'),
      lastActive: new Date(),
      onboardingCompleted: true,
    };

    await store.saveUser(testUser);
  });

  describe('aggregateMonthlyMetrics', () => {
    it('should aggregate metrics for a month with history', async () => {
      // Create some history for this month
      const now = new Date();
      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: now,
      };

      // Add 3 history items
      for (let i = 0; i < 3; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: testUser.id,
          timestamp: now,
          scenario,
          matchedVibes: ['vibe-1'],
          advice,
          rating: 4,
          regionFilterApplied: 'US-West',
          interestBoostsApplied: ['tech', 'fashion'],
        };
        await store.saveAdviceHistory(history);
      }

      // Aggregate metrics
      await service.aggregateMonthlyMetrics(testUser.id);

      // Get metrics for current month
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const metrics = await service.getMonthlyMetrics(testUser.id, month);

      expect(metrics).toBeDefined();
      expect(metrics?.queriesCount).toBe(3);
      expect(metrics?.topRegionsQueried['US-West']).toBe(3);
      expect(metrics?.topInterestMatches['tech']).toBe(3);
      expect(metrics?.topInterestMatches['fashion']).toBe(3);
      expect(metrics?.averageRating).toBe(4);
    });

    it('should handle months with no history', async () => {
      await service.aggregateMonthlyMetrics(testUser.id);

      const month = '2024-01';
      const metrics = await service.getMonthlyMetrics(testUser.id, month);

      expect(metrics).toBeNull();
    });

    it('should calculate average rating correctly', async () => {
      const now = new Date();
      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: now,
      };

      // Add history with different ratings
      const ratings = [5, 4, 3];
      for (let i = 0; i < ratings.length; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: testUser.id,
          timestamp: now,
          scenario,
          matchedVibes: [],
          advice,
          rating: ratings[i] as 1 | 2 | 3 | 4 | 5,
          regionFilterApplied: undefined,
          interestBoostsApplied: [],
        };
        await store.saveAdviceHistory(history);
      }

      await service.aggregateMonthlyMetrics(testUser.id);

      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const metrics = await service.getMonthlyMetrics(testUser.id, month);

      expect(metrics?.averageRating).toBe(4); // (5 + 4 + 3) / 3 = 4
    });
  });

  describe('getUserInsights', () => {
    beforeEach(async () => {
      // Create vibes for testing
      const vibe: Vibe = {
        id: 'vibe-1',
        name: 'Test Vibe',
        description: 'A test vibe',
        category: 'trend',
        keywords: ['test'],
        strength: 0.8,
        sentiment: 'positive',
        timestamp: new Date(),
        sources: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
        currentRelevance: 0.8,
      };
      await store.saveVibe(vibe);
    });

    it('should return insights with no history', async () => {
      const insights = await service.getUserInsights(testUser.id);

      expect(insights.totalQueries).toBe(0);
      expect(insights.queriesThisMonth).toBe(0);
      expect(insights.queriesLastMonth).toBe(0);
      expect(insights.topInterests).toEqual([]);
      expect(insights.satisfaction.averageRating).toBe(0);
    });

    it('should calculate total queries correctly', async () => {
      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      // Add 5 history items
      for (let i = 0; i < 5; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: testUser.id,
          timestamp: new Date(),
          scenario,
          matchedVibes: [],
          advice,
          regionFilterApplied: undefined,
          interestBoostsApplied: [],
        };
        await store.saveAdviceHistory(history);
      }

      const insights = await service.getUserInsights(testUser.id);

      expect(insights.totalQueries).toBe(5);
    });

    it('should identify top interests', async () => {
      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      // Add history with different interests
      const interestCombos = [
        ['tech', 'fashion'],
        ['tech', 'music'],
        ['tech'],
        ['fashion'],
      ];

      for (let i = 0; i < interestCombos.length; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: testUser.id,
          timestamp: new Date(),
          scenario,
          matchedVibes: [],
          advice,
          regionFilterApplied: undefined,
          interestBoostsApplied: interestCombos[i],
        };
        await store.saveAdviceHistory(history);
      }

      const insights = await service.getUserInsights(testUser.id);

      // tech: 3 times, fashion: 2 times, music: 1 time
      expect(insights.topInterests.length).toBeGreaterThan(0);
      expect(insights.topInterests[0].interest).toBe('tech');
      expect(insights.topInterests[0].count).toBe(3);
    });

    it('should identify top matched vibes', async () => {
      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      // Add history with matched vibes
      for (let i = 0; i < 3; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: testUser.id,
          timestamp: new Date(),
          scenario,
          matchedVibes: ['vibe-1'],
          advice,
          regionFilterApplied: undefined,
          interestBoostsApplied: [],
        };
        await store.saveAdviceHistory(history);
      }

      const insights = await service.getUserInsights(testUser.id);

      expect(insights.topMatchedVibes.length).toBe(1);
      expect(insights.topMatchedVibes[0].vibeId).toBe('vibe-1');
      expect(insights.topMatchedVibes[0].vibeName).toBe('Test Vibe');
      expect(insights.topMatchedVibes[0].count).toBe(3);
    });

    it('should calculate query patterns by day', async () => {
      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      // Add history for specific days
      const monday = new Date('2025-11-24'); // A Monday
      const tuesday = new Date('2025-11-25'); // A Tuesday

      const history1: AdviceHistory = {
        id: 'history-1',
        userId: testUser.id,
        timestamp: monday,
        scenario,
        matchedVibes: [],
        advice,
        regionFilterApplied: undefined,
        interestBoostsApplied: [],
      };

      const history2: AdviceHistory = {
        id: 'history-2',
        userId: testUser.id,
        timestamp: tuesday,
        scenario,
        matchedVibes: [],
        advice,
        regionFilterApplied: undefined,
        interestBoostsApplied: [],
      };

      await store.saveAdviceHistory(history1);
      await store.saveAdviceHistory(history2);

      const insights = await service.getUserInsights(testUser.id);

      expect(insights.queryPatterns.busyDays.length).toBe(7); // All days of week
      const mondayData = insights.queryPatterns.busyDays.find(d => d.day === 'Monday');
      const tuesdayData = insights.queryPatterns.busyDays.find(d => d.day === 'Tuesday');

      expect(mondayData?.count).toBe(1);
      expect(tuesdayData?.count).toBe(1);
    });

    it('should calculate satisfaction metrics', async () => {
      const scenario: Scenario = { description: 'Test scenario' };
      const advice: Advice = {
        scenario,
        matchedVibes: [],
        recommendations: { topics: [], behavior: [], style: [] },
        reasoning: 'Test',
        confidence: 0.8,
        timestamp: new Date(),
      };

      // Add history with ratings
      const ratings: Array<1 | 2 | 3 | 4 | 5> = [5, 5, 4, 3, 2];
      const helpful = [true, true, false, true, false];

      for (let i = 0; i < ratings.length; i++) {
        const history: AdviceHistory = {
          id: `history-${i}`,
          userId: testUser.id,
          timestamp: new Date(),
          scenario,
          matchedVibes: [],
          advice,
          rating: ratings[i],
          wasHelpful: helpful[i],
          regionFilterApplied: undefined,
          interestBoostsApplied: [],
        };
        await store.saveAdviceHistory(history);
      }

      const insights = await service.getUserInsights(testUser.id);

      expect(insights.satisfaction.totalRatings).toBe(5);
      expect(insights.satisfaction.averageRating).toBe(3.8); // (5+5+4+3+2)/5
      expect(insights.satisfaction.ratingDistribution[5]).toBe(2);
      expect(insights.satisfaction.ratingDistribution[4]).toBe(1);
      expect(insights.satisfaction.helpfulPercentage).toBe(60); // 3/5
    });
  });

  describe('getInsightsSummary', () => {
    it('should return a summary string', async () => {
      const scenario: Scenario = { description: 'Test scenario' };
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
        userId: testUser.id,
        timestamp: new Date(),
        scenario,
        matchedVibes: [],
        advice,
        rating: 5,
        regionFilterApplied: 'US-West',
        interestBoostsApplied: ['tech', 'fashion'],
      };

      await store.saveAdviceHistory(history);

      const summary = await service.getInsightsSummary(testUser.id);

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain('1');
      expect(summary).toContain('tech');
    });
  });
});
