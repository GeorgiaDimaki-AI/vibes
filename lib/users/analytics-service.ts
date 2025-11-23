/**
 * Analytics Service
 *
 * Tracks user behavior, usage patterns, and generates insights.
 * Provides analytics for user engagement, satisfaction, and trends.
 */

import { GraphStore } from '@/lib/graph/store';
import { Scenario, Vibe } from '@/lib/types';

/**
 * Monthly usage metrics (aggregated)
 */
export interface UsageMetrics {
  userId: string;
  month: string;  // "2025-11" format
  queriesCount: number;
  topRegionsQueried: Record<string, number>;
  topInterestMatches: Record<string, number>;
  averageRating?: number;
}

/**
 * Comprehensive user insights
 */
export interface UserInsights {
  // Usage patterns
  totalQueries: number;
  queriesThisMonth: number;
  queriesLastMonth: number;

  // Top data
  topInterests: Array<{ interest: string; count: number }>;
  topRegions: Array<{ region: string; count: number }>;
  topMatchedVibes: Array<{ vibeName: string; vibeId: string; count: number }>;
  topScenarios: Array<{ description: string; count: number }>;

  // Temporal patterns
  queryPatterns: {
    busyDays: Array<{ day: string; count: number }>;  // "Monday", "Tuesday", etc.
    busyHours: Array<{ hour: number; count: number }>;  // 0-23
    timeline: Array<{ date: string; count: number }>;  // Daily counts
  };

  // Quality metrics
  satisfaction: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;  // 1: 5, 2: 3, 3: 10, etc.
    helpfulPercentage: number;
  };

  // Trends
  trends: {
    queryGrowth: number;  // % change from last month
    satisfactionTrend: 'up' | 'down' | 'stable';
    emergingInterests: string[];  // New interests appearing
  };
}

/**
 * Analytics Service
 * Provides usage tracking and insights generation
 */
export class AnalyticsService {
  constructor(private store: GraphStore) {}

  /**
   * Track a query for analytics
   * Called after each advice request
   */
  async trackQuery(
    userId: string,
    scenario: Scenario,
    matchedVibes: Vibe[],
    regionFilter?: string,
    interestBoosts?: string[]
  ): Promise<void> {
    // This is handled by saving to advice_history
    // The aggregation happens in aggregateMonthlyMetrics
    // No action needed here - just a placeholder for future real-time tracking
  }

  /**
   * Get monthly metrics for a specific month
   */
  async getMonthlyMetrics(
    userId: string,
    month: string
  ): Promise<UsageMetrics | null> {
    return this.store.getUsageMetrics(userId, month);
  }

  /**
   * Aggregate monthly metrics from advice history
   * Should be run at the end of each month via cron
   */
  async aggregateMonthlyMetrics(userId: string): Promise<void> {
    // Get current and previous month
    const now = new Date();
    const currentMonth = this.formatMonth(now);

    // Also aggregate previous month if not done
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = this.formatMonth(prevDate);

    await this.aggregateMetricsForMonth(userId, currentMonth);
    await this.aggregateMetricsForMonth(userId, prevMonth);
  }

  /**
   * Aggregate metrics for a specific month
   */
  private async aggregateMetricsForMonth(userId: string, month: string): Promise<void> {
    // Parse month to get date range
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Get all history for this month
    // Note: We fetch a large limit to get all history, then filter by date
    const allHistory = await this.store.getAdviceHistory(userId, 10000, 0);
    const monthHistory = allHistory.filter(
      h => h.timestamp >= startDate && h.timestamp <= endDate
    );

    if (monthHistory.length === 0) {
      return; // No data for this month
    }

    // Calculate metrics
    const queriesCount = monthHistory.length;

    // Count regions
    const regionCounts: Record<string, number> = {};
    for (const item of monthHistory) {
      if (item.regionFilterApplied) {
        regionCounts[item.regionFilterApplied] = (regionCounts[item.regionFilterApplied] || 0) + 1;
      }
    }

    // Count interests
    const interestCounts: Record<string, number> = {};
    for (const item of monthHistory) {
      for (const interest of item.interestBoostsApplied) {
        interestCounts[interest] = (interestCounts[interest] || 0) + 1;
      }
    }

    // Calculate average rating
    const ratingsOnly = monthHistory.filter(h => h.rating !== undefined);
    const averageRating = ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum, h) => sum + (h.rating || 0), 0) / ratingsOnly.length
      : undefined;

    // Save metrics
    const metrics: UsageMetrics = {
      userId,
      month,
      queriesCount,
      topRegionsQueried: regionCounts,
      topInterestMatches: interestCounts,
      averageRating,
    };

    await this.store.saveUsageMetrics(metrics);
  }

  /**
   * Get comprehensive user insights
   */
  async getUserInsights(userId: string): Promise<UserInsights> {
    const now = new Date();
    const currentMonth = this.formatMonth(now);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = this.formatMonth(prevDate);

    // Get metrics for current and last month
    const currentMetrics = await this.getMonthlyMetrics(userId, currentMonth);
    const lastMetrics = await this.getMonthlyMetrics(userId, lastMonth);

    // Get all history for detailed analysis
    const allHistory = await this.store.getAdviceHistory(userId, 10000, 0);

    // Calculate usage patterns
    const totalQueries = allHistory.length;
    const queriesThisMonth = currentMetrics?.queriesCount || 0;
    const queriesLastMonth = lastMetrics?.queriesCount || 0;

    // Top interests
    const interestCounts = new Map<string, number>();
    for (const item of allHistory) {
      for (const interest of item.interestBoostsApplied) {
        interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
      }
    }
    const topInterests = Array.from(interestCounts.entries())
      .map(([interest, count]) => ({ interest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top regions
    const regionCounts = new Map<string, number>();
    for (const item of allHistory) {
      if (item.regionFilterApplied) {
        regionCounts.set(item.regionFilterApplied, (regionCounts.get(item.regionFilterApplied) || 0) + 1);
      }
    }
    const topRegions = Array.from(regionCounts.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top matched vibes
    const vibeCounts = new Map<string, number>();
    for (const item of allHistory) {
      for (const vibeId of item.matchedVibes) {
        vibeCounts.set(vibeId, (vibeCounts.get(vibeId) || 0) + 1);
      }
    }
    const topMatchedVibes: Array<{ vibeName: string; vibeId: string; count: number }> = [];
    const topVibeEntries = Array.from(vibeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [vibeId, count] of topVibeEntries) {
      const vibe = await this.store.getVibe(vibeId);
      topMatchedVibes.push({
        vibeId,
        vibeName: vibe?.name || 'Unknown',
        count,
      });
    }

    // Top scenarios
    const scenarioCounts = new Map<string, number>();
    for (const item of allHistory) {
      const desc = item.scenario.description.substring(0, 100); // Truncate for grouping
      scenarioCounts.set(desc, (scenarioCounts.get(desc) || 0) + 1);
    }
    const topScenarios = Array.from(scenarioCounts.entries())
      .map(([description, count]) => ({ description, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Query patterns - by day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Map<string, number>();
    for (const item of allHistory) {
      const day = dayNames[item.timestamp.getDay()];
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }
    const busyDays = dayNames
      .map(day => ({ day, count: dayCounts.get(day) || 0 }))
      .sort((a, b) => b.count - a.count);

    // Query patterns - by hour
    const hourCounts = new Map<number, number>();
    for (const item of allHistory) {
      const hour = item.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    const busyHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts.get(hour) || 0,
    })).sort((a, b) => b.count - a.count);

    // Query patterns - timeline (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentHistory = allHistory.filter(h => h.timestamp >= thirtyDaysAgo);
    const dateCounts = new Map<string, number>();
    for (const item of recentHistory) {
      const date = item.timestamp.toISOString().split('T')[0];
      dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
    }
    const timeline = Array.from(dateCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Satisfaction metrics
    const ratingsOnly = allHistory.filter(h => h.rating !== undefined);
    const totalRatings = ratingsOnly.length;
    const averageRating = totalRatings > 0
      ? ratingsOnly.reduce((sum, h) => sum + (h.rating || 0), 0) / totalRatings
      : 0;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of ratingsOnly) {
      if (item.rating) {
        ratingDistribution[item.rating] = (ratingDistribution[item.rating] || 0) + 1;
      }
    }

    const helpfulCount = allHistory.filter(h => h.wasHelpful === true).length;
    const helpfulTotal = allHistory.filter(h => h.wasHelpful !== undefined).length;
    const helpfulPercentage = helpfulTotal > 0 ? (helpfulCount / helpfulTotal) * 100 : 0;

    // Trends
    const queryGrowth = queriesLastMonth > 0
      ? ((queriesThisMonth - queriesLastMonth) / queriesLastMonth) * 100
      : 0;

    // Satisfaction trend (compare last 30 days vs previous 30 days)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const last30Days = allHistory.filter(
      h => h.timestamp >= thirtyDaysAgo && h.rating !== undefined
    );
    const prev30Days = allHistory.filter(
      h => h.timestamp >= sixtyDaysAgo && h.timestamp < thirtyDaysAgo && h.rating !== undefined
    );

    const avgLast30 = last30Days.length > 0
      ? last30Days.reduce((sum, h) => sum + (h.rating || 0), 0) / last30Days.length
      : 0;
    const avgPrev30 = prev30Days.length > 0
      ? prev30Days.reduce((sum, h) => sum + (h.rating || 0), 0) / prev30Days.length
      : 0;

    let satisfactionTrend: 'up' | 'down' | 'stable' = 'stable';
    if (avgLast30 > avgPrev30 + 0.2) {
      satisfactionTrend = 'up';
    } else if (avgLast30 < avgPrev30 - 0.2) {
      satisfactionTrend = 'down';
    }

    // Emerging interests (interests that appeared in last 30 days but not before)
    const recentInterests = new Set<string>();
    const olderInterests = new Set<string>();
    for (const item of allHistory) {
      for (const interest of item.interestBoostsApplied) {
        if (item.timestamp >= thirtyDaysAgo) {
          recentInterests.add(interest);
        } else {
          olderInterests.add(interest);
        }
      }
    }
    const emergingInterests = Array.from(recentInterests).filter(
      interest => !olderInterests.has(interest)
    );

    return {
      totalQueries,
      queriesThisMonth,
      queriesLastMonth,
      topInterests,
      topRegions,
      topMatchedVibes,
      topScenarios,
      queryPatterns: {
        busyDays,
        busyHours,
        timeline,
      },
      satisfaction: {
        averageRating,
        totalRatings,
        ratingDistribution,
        helpfulPercentage,
      },
      trends: {
        queryGrowth,
        satisfactionTrend,
        emergingInterests,
      },
    };
  }

  /**
   * Get a human-readable summary of insights
   */
  async getInsightsSummary(userId: string): Promise<string> {
    const insights = await this.getUserInsights(userId);

    const parts: string[] = [];

    // Overall usage
    parts.push(`You've made ${insights.totalQueries} queries in total, with ${insights.queriesThisMonth} this month.`);

    // Growth trend
    if (insights.trends.queryGrowth > 10) {
      parts.push(`Your usage has grown by ${insights.trends.queryGrowth.toFixed(1)}% compared to last month!`);
    } else if (insights.trends.queryGrowth < -10) {
      parts.push(`Your usage has decreased by ${Math.abs(insights.trends.queryGrowth).toFixed(1)}% compared to last month.`);
    }

    // Top interests
    if (insights.topInterests.length > 0) {
      const topInterestNames = insights.topInterests.slice(0, 3).map(i => i.interest).join(', ');
      parts.push(`Your top interests are: ${topInterestNames}.`);
    }

    // Top region
    if (insights.topRegions.length > 0) {
      parts.push(`You primarily explore vibes from ${insights.topRegions[0].region}.`);
    }

    // Activity patterns
    if (insights.queryPatterns.busyDays.length > 0) {
      const busiestDay = insights.queryPatterns.busyDays[0];
      if (busiestDay.count > 0) {
        parts.push(`You're most active on ${busiestDay.day}s.`);
      }
    }

    // Satisfaction
    if (insights.satisfaction.totalRatings > 0) {
      parts.push(`Your average satisfaction rating is ${insights.satisfaction.averageRating.toFixed(1)}/5 stars.`);

      if (insights.trends.satisfactionTrend === 'up') {
        parts.push(`Your satisfaction has been trending upward!`);
      } else if (insights.trends.satisfactionTrend === 'down') {
        parts.push(`Your satisfaction has been trending downward recently.`);
      }
    }

    // Emerging interests
    if (insights.trends.emergingInterests.length > 0) {
      parts.push(`New interests you're exploring: ${insights.trends.emergingInterests.slice(0, 3).join(', ')}.`);
    }

    return parts.join(' ');
  }

  /**
   * Format date as YYYY-MM for month keys
   */
  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
