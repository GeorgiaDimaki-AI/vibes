import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getHistory, DELETE as deleteAllHistory } from '../history/route';
import { GET as getHistoryItem, PUT as updateHistoryItem, DELETE as deleteHistoryItem } from '../history/[id]/route';
import { NextRequest } from 'next/server';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { HistoryService } from '@/lib/users/history-service';
import { Scenario, Advice } from '@/lib/types';

// Mock getStore to use MemoryGraphStore in tests
vi.mock('@/lib/graph', () => ({
  getStore: () => testStore,
}));

let testStore: MemoryGraphStore;

describe('History API Routes', () => {
  let testUserId: string;
  let historyService: HistoryService;

  beforeEach(async () => {
    testUserId = 'test-user-123';
    testStore = new MemoryGraphStore();
    historyService = new HistoryService(testStore);
  });

  const createMockScenario = (): Scenario => ({
    description: 'Dinner with tech friends',
  });

  const createMockAdvice = (): Advice => ({
    scenario: createMockScenario(),
    matchedVibes: [],
    recommendations: {
      topics: [],
      behavior: [],
      style: [],
    },
    reasoning: 'Test advice',
    confidence: 0.8,
    timestamp: new Date(),
  });

  describe('GET /api/history', () => {
    it('should return user history', async () => {
      // Create some history
      await historyService.saveAdvice({
        userId: testUserId,
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: ['vibe1'],
      });

      const url = `http://localhost:3000/api/history?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await getHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toBeDefined();
      expect(Array.isArray(data.history)).toBe(true);
      expect(data.history.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      // Create multiple history items
      for (let i = 0; i < 5; i++) {
        await historyService.saveAdvice({
          userId: testUserId,
          scenario: createMockScenario(),
          advice: createMockAdvice(),
          matchedVibes: [],
        });
      }

      const url = `http://localhost:3000/api/history?userId=${testUserId}&limit=2&offset=0`;
      const request = new NextRequest(url);

      const response = await getHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(2);
    });

    it('should require userId', async () => {
      const url = `http://localhost:3000/api/history`;
      const request = new NextRequest(url);

      const response = await getHistory(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('DELETE /api/history', () => {
    it('should delete all history for user', async () => {
      // Create some history
      await historyService.saveAdvice({
        userId: testUserId,
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: [],
      });

      const url = `http://localhost:3000/api/history?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await deleteAllHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify history is empty
      const history = await historyService.getHistory(testUserId);
      expect(history).toHaveLength(0);
    });
  });

  describe('GET /api/history/[id]', () => {
    it('should return specific history item', async () => {
      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: ['vibe1'],
      });

      const url = `http://localhost:3000/api/history/${historyId}?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await getHistoryItem(request, { params: { id: historyId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item).toBeDefined();
      expect(data.item.id).toBe(historyId);
    });

    it('should return 404 for non-existent item', async () => {
      const url = `http://localhost:3000/api/history/non-existent?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await getHistoryItem(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should prevent accessing other user\'s history', async () => {
      const historyId = await historyService.saveAdvice({
        userId: 'user1',
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: [],
      });

      const url = `http://localhost:3000/api/history/${historyId}?userId=user2`;
      const request = new NextRequest(url);

      const response = await getHistoryItem(request, { params: { id: historyId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('PUT /api/history/[id]', () => {
    it('should update rating', async () => {
      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: [],
      });

      const url = `http://localhost:3000/api/history/${historyId}?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ rating: 5, feedback: 'Great!' }),
      });

      const response = await updateHistoryItem(request, { params: { id: historyId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify rating was updated
      const item = await historyService.getHistoryItem(historyId, testUserId);
      expect(item!.rating).toBe(5);
      expect(item!.feedback).toBe('Great!');
    });

    it('should update helpful status', async () => {
      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: [],
      });

      const url = `http://localhost:3000/api/history/${historyId}?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ wasHelpful: true }),
      });

      const response = await updateHistoryItem(request, { params: { id: historyId } });
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify helpful status was updated
      const item = await historyService.getHistoryItem(historyId, testUserId);
      expect(item!.wasHelpful).toBe(true);
    });

    it('should reject invalid ratings', async () => {
      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: [],
      });

      const url = `http://localhost:3000/api/history/${historyId}?userId=${testUserId}`;
      const request = new NextRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ rating: 6 }),
      });

      const response = await updateHistoryItem(request, { params: { id: historyId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Rating must be');
    });
  });

  describe('DELETE /api/history/[id]', () => {
    it('should delete specific history item', async () => {
      const historyId = await historyService.saveAdvice({
        userId: testUserId,
        scenario: createMockScenario(),
        advice: createMockAdvice(),
        matchedVibes: [],
      });

      const url = `http://localhost:3000/api/history/${historyId}?userId=${testUserId}`;
      const request = new NextRequest(url);

      const response = await deleteHistoryItem(request, { params: { id: historyId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify item is deleted
      const item = await historyService.getHistoryItem(historyId, testUserId);
      expect(item).toBeNull();
    });
  });
});
