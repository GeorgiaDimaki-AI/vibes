/**
 * Base matcher implementations and registry
 */

import { Matcher, Scenario, CulturalGraph, VibeMatch } from '@/lib/types';

/**
 * Abstract base class for matchers
 * Extend this to create new matching strategies
 */
export abstract class BaseMatcher implements Matcher {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]>;

  /**
   * Helper to sort matches by relevance score
   */
  protected sortByRelevance(matches: VibeMatch[]): VibeMatch[] {
    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Helper to limit number of matches
   */
  protected topN(matches: VibeMatch[], n: number): VibeMatch[] {
    return this.sortByRelevance(matches).slice(0, n);
  }

  /**
   * Helper to filter by minimum relevance threshold
   */
  protected filterByThreshold(matches: VibeMatch[], threshold: number): VibeMatch[] {
    return matches.filter(m => m.relevanceScore >= threshold);
  }
}

/**
 * Matcher Registry
 * Manages different matching strategies and can combine them
 */
export class MatcherRegistry {
  private matchers: Map<string, Matcher> = new Map();
  private defaultMatcher?: string;

  register(matcher: Matcher, isDefault = false): void {
    this.matchers.set(matcher.name, matcher);
    if (isDefault) {
      this.defaultMatcher = matcher.name;
    }
  }

  setDefault(name: string): void {
    if (this.matchers.has(name)) {
      this.defaultMatcher = name;
    }
  }

  get(name: string): Matcher | undefined {
    return this.matchers.get(name);
  }

  getDefault(): Matcher | undefined {
    return this.defaultMatcher
      ? this.matchers.get(this.defaultMatcher)
      : this.matchers.values().next().value;
  }

  getAll(): Matcher[] {
    return Array.from(this.matchers.values());
  }

  async matchWithDefault(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    const matcher = this.getDefault();
    if (!matcher) {
      throw new Error('No matcher available');
    }
    return matcher.match(scenario, graph);
  }

  async matchWith(name: string, scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    const matcher = this.matchers.get(name);
    if (!matcher) {
      throw new Error(`Matcher ${name} not found`);
    }
    return matcher.match(scenario, graph);
  }

  /**
   * Combine results from multiple matchers using weighted averaging
   */
  async matchWithMultiple(
    matcherNames: string[],
    scenario: Scenario,
    graph: CulturalGraph,
    weights?: Map<string, number>
  ): Promise<VibeMatch[]> {
    const matchers = matcherNames
      .map(name => this.matchers.get(name))
      .filter((m): m is Matcher => m !== undefined);

    if (matchers.length === 0) {
      throw new Error('No valid matchers found');
    }

    // Get results from all matchers
    const allResults = await Promise.all(
      matchers.map(async (matcher, idx) => ({
        matcher: matcherNames[idx],
        matches: await matcher.match(scenario, graph),
      }))
    );

    // Combine results
    const vibeScores = new Map<string, { scores: number[]; matches: VibeMatch[] }>();

    for (const { matcher, matches } of allResults) {
      const weight = weights?.get(matcher) || 1.0;

      for (const match of matches) {
        const existing = vibeScores.get(match.vibe.id);
        if (existing) {
          existing.scores.push(match.relevanceScore * weight);
        } else {
          vibeScores.set(match.vibe.id, {
            scores: [match.relevanceScore * weight],
            matches: [match],
          });
        }
      }
    }

    // Calculate weighted average scores
    const combinedMatches: VibeMatch[] = [];
    for (const [vibeId, { scores, matches }] of vibeScores.entries()) {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      combinedMatches.push({
        vibe: matches[0].vibe,
        relevanceScore: avgScore,
        reasoning: `Combined from ${scores.length} matcher(s)`,
      });
    }

    return combinedMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Use multiple matchers and take the union of top results
   */
  async matchWithEnsemble(
    matcherNames: string[],
    scenario: Scenario,
    graph: CulturalGraph,
    topNPerMatcher = 10
  ): Promise<VibeMatch[]> {
    const matchers = matcherNames
      .map(name => this.matchers.get(name))
      .filter((m): m is Matcher => m !== undefined);

    const allResults = await Promise.all(
      matchers.map(m => m.match(scenario, graph))
    );

    // Take top N from each matcher
    const seen = new Set<string>();
    const ensemble: VibeMatch[] = [];

    for (const matches of allResults) {
      const topMatches = matches
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, topNPerMatcher);

      for (const match of topMatches) {
        if (!seen.has(match.vibe.id)) {
          seen.add(match.vibe.id);
          ensemble.push(match);
        }
      }
    }

    return ensemble.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

// Global registry instance
export const matcherRegistry = new MatcherRegistry();
