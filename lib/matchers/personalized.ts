/**
 * Personalized Matcher
 *
 * Extends semantic matching with user preference filtering and boosting.
 * This matcher provides the core personalization logic for multi-user support.
 *
 * Features:
 * - Regional filtering (prefer vibes relevant to user's region)
 * - Topic avoidance (filter out unwanted topics)
 * - Interest boosting (increase relevance of matching interests)
 * - Temporal decay integration
 * - Graceful fallback to non-personalized matching
 */

import { BaseMatcher } from './base';
import { Scenario, CulturalGraph, VibeMatch, UserProfile, Vibe } from '@/lib/types';
import { getEmbeddingProvider } from '@/lib/embeddings';
import { applyDecayToVibes } from '@/lib/temporal-decay';
import {
  isTopicAvoided,
  calculateInterestMatch,
  getRegionalRelevance,
  meetsRegionalThreshold,
} from '@/lib/users/personalization-utils';

export class PersonalizedMatcher extends BaseMatcher {
  readonly name = 'personalized';
  readonly description = 'Personalized vibe matching with user preferences';

  async match(
    scenario: Scenario,
    graph: CulturalGraph,
    userProfile?: UserProfile
  ): Promise<VibeMatch[]> {
    try {
      // Get all vibes and apply temporal decay
      let vibes = Array.from(graph.vibes.values());
      vibes = applyDecayToVibes(vibes);

      // If no user profile, fall back to basic semantic matching
      if (!userProfile) {
        return this.semanticMatch(scenario, vibes);
      }

      // Step 1: Filter by region (soft filter - keep all but prioritize regional)
      if (userProfile.region) {
        vibes = this.filterByRegion(vibes, userProfile.region);
      }

      // Step 2: Filter out avoided topics (hard filter)
      if (userProfile.avoidTopics && userProfile.avoidTopics.length > 0) {
        vibes = this.filterOutTopics(vibes, userProfile.avoidTopics);
      }

      // Step 3: Perform semantic matching on filtered vibes
      let matches = await this.semanticMatch(scenario, vibes);

      // Step 4: Boost by interests
      if (userProfile.interests && userProfile.interests.length > 0) {
        matches = this.boostByInterests(matches, userProfile.interests);
      }

      // Step 5: Apply regional relevance boosting
      if (userProfile.region) {
        matches = this.applyRegionalBoost(matches, userProfile.region);
      }

      // Re-sort by updated relevance scores
      matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Return top matches
      return this.topN(matches, 20);
    } catch (error) {
      console.error('Personalized matching failed:', error);
      return [];
    }
  }

  /**
   * Filter vibes by regional relevance
   * Uses soft filtering: keeps global vibes and vibes above minimum threshold
   */
  private filterByRegion(vibes: Vibe[], region: string): Vibe[] {
    return vibes.filter(vibe => {
      // Always keep global vibes
      if (vibe.geography?.primary === 'Global') {
        return true;
      }

      // Keep vibes that meet minimum regional threshold (0.2)
      return meetsRegionalThreshold(vibe, region, 0.2);
    });
  }

  /**
   * Filter out vibes whose keywords/description match avoided topics
   */
  private filterOutTopics(vibes: Vibe[], avoidTopics: string[]): Vibe[] {
    return vibes.filter(vibe => !isTopicAvoided(vibe, avoidTopics));
  }

  /**
   * Boost vibes that match user interests
   * Applies a 1.5x multiplier to matching vibes
   */
  private boostByInterests(matches: VibeMatch[], interests: string[]): VibeMatch[] {
    return matches.map(match => {
      const interestMatch = calculateInterestMatch(match.vibe, interests);

      if (interestMatch > 0) {
        // Apply boost proportional to interest match (up to 1.5x)
        const boost = 1.0 + (interestMatch * 0.5);
        const newScore = Math.min(1.0, match.relevanceScore * boost);

        return {
          ...match,
          relevanceScore: newScore,
          reasoning: `${match.reasoning} (Interest boost: ${(interestMatch * 100).toFixed(0)}%)`,
        };
      }

      return match;
    });
  }

  /**
   * Apply regional relevance as a multiplier to scores
   */
  private applyRegionalBoost(matches: VibeMatch[], region: string): VibeMatch[] {
    return matches.map(match => {
      const regionalRelevance = getRegionalRelevance(match.vibe, region);

      // Apply regional relevance as multiplier
      // Global/highly relevant = 1.0x (no change)
      // Moderate relevance = 0.5-0.8x
      // Low relevance = 0.3x
      const adjustedScore = match.relevanceScore * regionalRelevance;

      // Only update reasoning if regional relevance is not 1.0
      const reasoning = regionalRelevance < 1.0
        ? `${match.reasoning} (Regional: ${(regionalRelevance * 100).toFixed(0)}%)`
        : match.reasoning;

      return {
        ...match,
        relevanceScore: adjustedScore,
        reasoning,
      };
    });
  }

  /**
   * Perform semantic matching using embeddings
   * This is the same logic as SemanticMatcher but encapsulated here
   */
  private async semanticMatch(scenario: Scenario, vibes: Vibe[]): Promise<VibeMatch[]> {
    try {
      // Generate embedding for scenario
      const scenarioText = this.scenarioToText(scenario);
      const scenarioEmbedding = await this.getEmbedding(scenarioText);

      // Calculate similarity to all vibes
      const matches: VibeMatch[] = [];

      for (const vibe of vibes) {
        if (!vibe.embedding) {
          // Skip vibes without embeddings
          continue;
        }

        const similarity = this.cosineSimilarity(scenarioEmbedding, vibe.embedding);

        if (similarity > 0.5) {
          // Threshold for relevance
          matches.push({
            vibe,
            relevanceScore: similarity,
            reasoning: `Semantic similarity: ${(similarity * 100).toFixed(1)}%`,
          });
        }
      }

      return matches;
    } catch (error) {
      console.error('Semantic matching failed in PersonalizedMatcher:', error);
      return [];
    }
  }

  /**
   * Convert scenario to text for embedding
   */
  private scenarioToText(scenario: Scenario): string {
    const parts = [scenario.description];

    if (scenario.context) {
      const ctx = scenario.context;
      if (ctx.location) parts.push(`Location: ${ctx.location}`);
      if (ctx.timeOfDay) parts.push(`Time: ${ctx.timeOfDay}`);
      if (ctx.peopleTypes?.length) parts.push(`People: ${ctx.peopleTypes.join(', ')}`);
      if (ctx.formality) parts.push(`Formality: ${ctx.formality}`);
    }

    if (scenario.preferences) {
      const prefs = scenario.preferences;
      if (prefs.topics?.length) parts.push(`Interested in: ${prefs.topics.join(', ')}`);
      if (prefs.conversationStyle) parts.push(`Style: ${prefs.conversationStyle}`);
    }

    return parts.join('. ');
  }

  /**
   * Generate embedding for text
   */
  private async getEmbedding(text: string): Promise<number[]> {
    const embeddingProvider = await getEmbeddingProvider();
    return await embeddingProvider.generateEmbedding(text);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    // Validate dimensional compatibility
    if (!a || !b || a.length !== b.length) {
      if (a && b && a.length !== b.length) {
        console.warn(`[PersonalizedMatcher] Dimension mismatch: ${a.length} vs ${b.length}`);
      }
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }
}
