/**
 * Semantic Matcher
 * Uses embeddings to match scenarios to vibes based on semantic similarity
 */

import { BaseMatcher } from './base';
import { Scenario, CulturalGraph, VibeMatch } from '@/lib/types';
import { getEmbeddingProvider } from '@/lib/embeddings';

export class SemanticMatcher extends BaseMatcher {
  readonly name = 'semantic';
  readonly description = 'Matches scenarios to vibes using semantic similarity';

  async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    try {
      // Generate embedding for scenario
      const scenarioText = this.scenarioToText(scenario);
      const scenarioEmbedding = await this.getEmbedding(scenarioText);

      // Calculate similarity to all vibes
      const matches: VibeMatch[] = [];

      for (const vibe of graph.vibes.values()) {
        if (!vibe.embedding) {
          // Skip vibes without embeddings
          continue;
        }

        const similarity = this.cosineSimilarity(scenarioEmbedding, vibe.embedding);

        if (similarity > 0.5) { // Threshold for relevance
          matches.push({
            vibe,
            relevanceScore: similarity,
            reasoning: `Semantic similarity: ${(similarity * 100).toFixed(1)}%`,
          });
        }
      }

      return this.topN(matches, 20);
    } catch (error) {
      console.error('Semantic matching failed:', error);
      return [];
    }
  }

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

  private async getEmbedding(text: string): Promise<number[]> {
    const embeddingProvider = await getEmbeddingProvider();
    return await embeddingProvider.generateEmbedding(text);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    // Validate dimensional compatibility
    if (!a || !b || a.length !== b.length) {
      if (a && b && a.length !== b.length) {
        console.warn(`[SemanticMatcher] Dimension mismatch: ${a.length} vs ${b.length}`);
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
