/**
 * Analytics API Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock modules
jest.mock('@/lib/middleware/auth');
jest.mock('@/lib/graph');
jest.mock('@/lib/users/analytics-service');

import { GET as insightsGET } from '../analytics/insights/route';
import { GET as summaryGET } from '../analytics/summary/route';
import { GET as metricsGET } from '../analytics/metrics/route';
import { requireAuth } from '@/lib/middleware/auth';
import { getStore } from '@/lib/graph';
import { AnalyticsService } from '@/lib/users/analytics-service';
import { NextRequest } from 'next/server';

describe('Analytics API', () => {
  const mockUser = {
    id: 'test-user-1',
    email: 'test@example.com',
    tier: 'regular' as const,
    queriesThisMonth: 5,
    queryLimit: 100,
    interests: ['tech'],
    avoidTopics: [],
    conversationStyle: 'casual' as const,
    emailNotifications: true,
    shareDataForResearch: false,
    createdAt: new Date(),
    lastActive: new Date(),
    onboardingCompleted: true,
  };

  const mockStore = {};
  const mockAnalyticsService = {
    getUserInsights: jest.fn(),
    getInsightsSummary: jest.fn(),
    getMonthlyMetrics: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockResolvedValue(mockUser);
    (getStore as jest.Mock).mockReturnValue(mockStore);
    (AnalyticsService as jest.Mock).mockReturnValue(mockAnalyticsService);
  });

  describe('GET /api/analytics/insights', () => {
    it('should return insights for authenticated user', async () => {
      const mockInsights = {
        totalQueries: 10,
        queriesThisMonth: 5,
        queriesLastMonth: 3,
        topInterests: [{ interest: 'tech', count: 5 }],
        topRegions: [],
        topMatchedVibes: [],
        topScenarios: [],
        queryPatterns: {
          busyDays: [],
          busyHours: [],
          timeline: [],
        },
        satisfaction: {
          averageRating: 4.5,
          totalRatings: 5,
          ratingDistribution: {},
          helpfulPercentage: 80,
        },
        trends: {
          queryGrowth: 66.7,
          satisfactionTrend: 'up' as const,
          emergingInterests: [],
        },
      };

      mockAnalyticsService.getUserInsights.mockResolvedValue(mockInsights);

      const request = new NextRequest('http://localhost:3000/api/analytics/insights');
      const response = await insightsGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.insights).toEqual(mockInsights);
    });

    it('should require authentication', async () => {
      (requireAuth as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost:3000/api/analytics/insights');
      const response = await insightsGET(request);

      expect(response.status).not.toBe(200);
    });
  });

  describe('GET /api/analytics/summary', () => {
    it('should return summary for authenticated user', async () => {
      const mockSummary = 'You have made 10 queries this month!';
      mockAnalyticsService.getInsightsSummary.mockResolvedValue(mockSummary);

      const request = new NextRequest('http://localhost:3000/api/analytics/summary');
      const response = await summaryGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.summary).toBe(mockSummary);
    });
  });

  describe('GET /api/analytics/metrics', () => {
    it('should return metrics for current month by default', async () => {
      const mockMetrics = {
        userId: 'test-user-1',
        month: '2025-11',
        queriesCount: 5,
        topRegionsQueried: {},
        topInterestMatches: {},
        averageRating: 4.5,
      };

      mockAnalyticsService.getMonthlyMetrics.mockResolvedValue(mockMetrics);

      const request = new NextRequest('http://localhost:3000/api/analytics/metrics');
      const response = await metricsGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metrics).toEqual(mockMetrics);
    });

    it('should return metrics for specified month', async () => {
      const mockMetrics = {
        userId: 'test-user-1',
        month: '2025-10',
        queriesCount: 3,
        topRegionsQueried: {},
        topInterestMatches: {},
        averageRating: 4.0,
      };

      mockAnalyticsService.getMonthlyMetrics.mockResolvedValue(mockMetrics);

      const request = new NextRequest('http://localhost:3000/api/analytics/metrics?month=2025-10');
      const response = await metricsGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metrics).toEqual(mockMetrics);
    });

    it('should validate month format', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics/metrics?month=invalid');
      const response = await metricsGET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid month format');
    });

    it('should return null metrics if no data', async () => {
      mockAnalyticsService.getMonthlyMetrics.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics/metrics?month=2020-01');
      const response = await metricsGET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metrics).toBeNull();
    });
  });
});
