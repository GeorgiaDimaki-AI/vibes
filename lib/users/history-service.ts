/**
 * History Service
 * Manages user's advice history tracking
 */

import { GraphStore } from '@/lib/graph/store';
import { Scenario, Advice, AdviceHistory, HistoryStats } from '@/lib/types';
import { randomUUID } from 'crypto';

export interface SaveAdviceOptions {
  userId: string;
  scenario: Scenario;
  advice: Advice;
  matchedVibes: string[];
  regionFilterApplied?: string;
  interestBoostsApplied?: string[];
}

export class HistoryService {
  constructor(private store: GraphStore) {}

  /**
   * Save advice to user's history
   */
  async saveAdvice(options: SaveAdviceOptions): Promise<string> {
    const {
      userId,
      scenario,
      advice,
      matchedVibes,
      regionFilterApplied,
      interestBoostsApplied = [],
    } = options;

    const id = randomUUID();
    const timestamp = new Date();

    const historyItem: AdviceHistory = {
      id,
      userId,
      timestamp,
      scenario,
      matchedVibes,
      advice,
      regionFilterApplied,
      interestBoostsApplied,
    };

    await this.store.saveAdviceHistory(historyItem);
    return id;
  }

  /**
   * Get user's advice history with pagination
   */
  async getHistory(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<AdviceHistory[]> {
    return this.store.getAdviceHistory(userId, limit, offset);
  }

  /**
   * Get a specific history item
   */
  async getHistoryItem(
    id: string,
    userId: string
  ): Promise<AdviceHistory | null> {
    const item = await this.store.getAdviceHistoryItem(id);

    // Verify ownership
    if (item && item.userId !== userId) {
      throw new Error('Unauthorized: Cannot access other user\'s history');
    }

    return item;
  }

  /**
   * Rate advice and optionally provide feedback
   */
  async rateAdvice(
    id: string,
    userId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    // Verify ownership
    const item = await this.getHistoryItem(id, userId);
    if (!item) {
      throw new Error('History item not found');
    }

    await this.store.updateAdviceRating(id, rating, feedback);
  }

  /**
   * Mark advice as helpful or not helpful
   */
  async markHelpful(
    id: string,
    userId: string,
    wasHelpful: boolean
  ): Promise<void> {
    // Verify ownership
    const item = await this.getHistoryItem(id, userId);
    if (!item) {
      throw new Error('History item not found');
    }

    await this.store.updateAdviceHelpful(id, wasHelpful);
  }

  /**
   * Delete a specific history item
   */
  async deleteHistory(id: string, userId: string): Promise<void> {
    // Verify ownership
    const item = await this.getHistoryItem(id, userId);
    if (!item) {
      throw new Error('History item not found');
    }

    await this.store.deleteAdviceHistory(id);
  }

  /**
   * Delete all history for a user
   */
  async deleteAllHistory(userId: string): Promise<void> {
    await this.store.deleteAllAdviceHistory(userId);
  }

  /**
   * Get statistics about user's advice history
   */
  async getHistoryStats(userId: string): Promise<HistoryStats> {
    const history = await this.store.getAdviceHistory(userId, 1000, 0);

    const totalQueries = history.length;
    const ratingsOnly = history.filter(h => h.rating !== undefined);
    const totalRatings = ratingsOnly.length;
    const averageRating = totalRatings > 0
      ? ratingsOnly.reduce((sum, h) => sum + (h.rating || 0), 0) / totalRatings
      : undefined;

    const helpfulCount = history.filter(h => h.wasHelpful === true).length;

    // Count scenario descriptions
    const scenarioCounts = new Map<string, number>();
    for (const item of history) {
      const desc = item.scenario.description;
      scenarioCounts.set(desc, (scenarioCounts.get(desc) || 0) + 1);
    }

    const mostCommonScenarios = Array.from(scenarioCounts.entries())
      .map(([description, count]) => ({ description, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count matched vibes
    const vibeCounts = new Map<string, number>();
    for (const item of history) {
      for (const vibeId of item.matchedVibes) {
        vibeCounts.set(vibeId, (vibeCounts.get(vibeId) || 0) + 1);
      }
    }

    // Get vibe names for top vibes
    const topMatchedVibes: Array<{ vibeName: string; count: number }> = [];
    const topVibeEntries = Array.from(vibeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [vibeId, count] of topVibeEntries) {
      const vibe = await this.store.getVibe(vibeId);
      topMatchedVibes.push({
        vibeName: vibe?.name || vibeId,
        count,
      });
    }

    return {
      totalQueries,
      averageRating,
      totalRatings,
      helpfulCount,
      mostCommonScenarios,
      topMatchedVibes,
    };
  }
}
