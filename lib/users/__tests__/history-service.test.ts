import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../history-service';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { Scenario, Advice, UserProfile } from '@/lib/types';

describe('HistoryService', () => {
  let store: MemoryGraphStore;
  let historyService: HistoryService;
  let testUserId: string;

  beforeEach(() => {
    store = new MemoryGraphStore();
    historyService = new HistoryService(store);
    testUserId = 'test-user-123';
  });

  const createMockScenario = (): Scenario => ({
    description: 'Dinner with tech friends at a trendy restaurant',
    context: {
      location: 'San Francisco',
      timeOfDay: 'evening',
      peopleTypes: ['tech workers'],
      formality: 'casual',
    },
  });

  const createMockAdvice = (): Advice => ({
    scenario: createMockScenario(),
    matchedVibes: [],
    recommendations: {
      topics: [],
      behavior: [],
      style: [],
    },
    reasoning: 'Test advice reasoning',
    confidence: 0.8,
    timestamp: new Date(),
  });

  describe('saveAdvice', () => {
    it('should save advice history successfully', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: ['vibe1', 'vibe2'],
        regionFilterApplied: 'US-West',
        interestBoostsApplied: ['tech', 'food'],
      });

      expect(historyId).toBeDefined();
      expect(typeof historyId).toBe('string');

      // Verify it was saved
      const history = await historyService.getHistory(testUserId);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(historyId);
      expect(history[0].userId).toBe(testUserId);
      expect(history[0].scenario.description).toBe(scenario.description);
    });

    it('should save multiple advice items', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: ['vibe1'],
      });

      await historyService.saveAdvice({
        userId: testUserId,
        scenario: { ...scenario, description: 'Different scenario' },
        advice,
        matchedVibes: ['vibe2'],
      });

      const history = await historyService.getHistory(testUserId);
      expect(history).toHaveLength(2);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for user with no history', async () => {
      const history = await historyService.getHistory('new-user');
      expect(history).toEqual([]);
    });

    it('should return history in descending order by timestamp', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      // Save three items with small delays
      const id1 = await historyService.saveAdvice({
        userId: testUserId,
        scenario: { ...scenario, description: 'First' },
        advice,
        matchedVibes: [],
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const id2 = await historyService.saveAdvice({
        userId: testUserId,
        scenario: { ...scenario, description: 'Second' },
        advice,
        matchedVibes: [],
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const id3 = await historyService.saveAdvice({
        userId: testUserId,
        scenario: { ...scenario, description: 'Third' },
        advice,
        matchedVibes: [],
      });

      const history = await historyService.getHistory(testUserId);

      // Should be in reverse chronological order
      expect(history[0].id).toBe(id3);
      expect(history[1].id).toBe(id2);
      expect(history[2].id).toBe(id1);
    });

    it('should support pagination', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      // Save 5 items
      for (let i = 0; i < 5; i++) {
        await historyService.saveAdvice({
          userId: testUserId,
          scenario: { ...scenario, description: `Item ${i}` },
          advice,
          matchedVibes: [],
        });
      }

      // Get first page (2 items)
      const page1 = await historyService.getHistory(testUserId, 2, 0);
      expect(page1).toHaveLength(2);

      // Get second page (2 items)
      const page2 = await historyService.getHistory(testUserId, 2, 2);
      expect(page2).toHaveLength(2);

      // Get third page (1 item)
      const page3 = await historyService.getHistory(testUserId, 2, 4);
      expect(page3).toHaveLength(1);

      // Verify no overlap
      expect(page1[0].id).not.toBe(page2[0].id);
      expect(page2[0].id).not.toBe(page3[0].id);
    });
  });

  describe('getHistoryItem', () => {
    it('should return specific history item', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: ['vibe1'],
      });

      const item = await historyService.getHistoryItem(historyId, testUserId);
      expect(item).toBeDefined();
      expect(item!.id).toBe(historyId);
      expect(item!.scenario.description).toBe(scenario.description);
    });

    it('should return null for non-existent item', async () => {
      const item = await historyService.getHistoryItem('non-existent', testUserId);
      expect(item).toBeNull();
    });

    it('should throw error when accessing other user\'s history', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: 'user1',
        scenario,
        advice,
        matchedVibes: [],
      });

      await expect(
        historyService.getHistoryItem(historyId, 'user2')
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('rateAdvice', () => {
    it('should rate advice successfully', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: [],
      });

      await historyService.rateAdvice(historyId, testUserId, 5, 'Great advice!');

      const item = await historyService.getHistoryItem(historyId, testUserId);
      expect(item!.rating).toBe(5);
      expect(item!.feedback).toBe('Great advice!');
    });

    it('should reject invalid ratings', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: [],
      });

      await expect(
        historyService.rateAdvice(historyId, testUserId, 6)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      await expect(
        historyService.rateAdvice(historyId, testUserId, 0)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      await expect(
        historyService.rateAdvice(historyId, testUserId, 3.5)
      ).rejects.toThrow('Rating must be an integer between 1 and 5');
    });
  });

  describe('markHelpful', () => {
    it('should mark advice as helpful', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: [],
      });

      await historyService.markHelpful(historyId, testUserId, true);

      const item = await historyService.getHistoryItem(historyId, testUserId);
      expect(item!.wasHelpful).toBe(true);
    });
  });

  describe('deleteHistory', () => {
    it('should delete specific history item', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: [],
      });

      await historyService.deleteHistory(historyId, testUserId);

      const item = await historyService.getHistoryItem(historyId, testUserId);
      expect(item).toBeNull();
    });

    it('should throw error when deleting other user\'s history', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      const historyId = await historyService.saveAdvice({
        userId: 'user1',
        scenario,
        advice,
        matchedVibes: [],
      });

      await expect(
        historyService.deleteHistory(historyId, 'user2')
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteAllHistory', () => {
    it('should delete all history for a user', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      // Create multiple history items
      await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: [],
      });

      await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: [],
      });

      let history = await historyService.getHistory(testUserId);
      expect(history).toHaveLength(2);

      await historyService.deleteAllHistory(testUserId);

      history = await historyService.getHistory(testUserId);
      expect(history).toHaveLength(0);
    });
  });

  describe('getHistoryStats', () => {
    it('should calculate correct stats', async () => {
      const scenario = createMockScenario();
      const advice = createMockAdvice();

      // Create some history with ratings
      const id1 = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: ['vibe1', 'vibe2'],
      });
      await historyService.rateAdvice(id1, testUserId, 5);
      await historyService.markHelpful(id1, testUserId, true);

      const id2 = await historyService.saveAdvice({
        userId: testUserId,
        scenario,
        advice,
        matchedVibes: ['vibe1', 'vibe3'],
      });
      await historyService.rateAdvice(id2, testUserId, 3);

      const stats = await historyService.getHistoryStats(testUserId);

      expect(stats.totalQueries).toBe(2);
      expect(stats.totalRatings).toBe(2);
      expect(stats.averageRating).toBe(4); // (5 + 3) / 2
      expect(stats.helpfulCount).toBe(1);
    });

    it('should return empty stats for user with no history', async () => {
      const stats = await historyService.getHistoryStats('new-user');

      expect(stats.totalQueries).toBe(0);
      expect(stats.totalRatings).toBe(0);
      expect(stats.averageRating).toBeUndefined();
      expect(stats.helpfulCount).toBe(0);
      expect(stats.mostCommonScenarios).toEqual([]);
      expect(stats.topMatchedVibes).toEqual([]);
    });
  });
});
