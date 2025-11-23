/**
 * Base analyzer implementations and registry
 */

import { Analyzer, RawContent, Vibe } from '@/lib/types';
import { mergeVibeOccurrence, suggestHalfLife, applyMultipleHaloEffects } from '@/lib/temporal-decay';

/**
 * Abstract base class for analyzers
 * Extend this to create new analysis strategies
 */
export abstract class BaseAnalyzer implements Analyzer {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract analyze(content: RawContent[]): Promise<Vibe[]>;

  async update(existingVibes: Vibe[], newContent: RawContent[]): Promise<Vibe[]> {
    // Default implementation: analyze new content and merge
    const newVibes = await this.analyze(newContent);
    return this.mergeVibes(existingVibes, newVibes);
  }

  /**
   * Helper to merge existing and new vibes with temporal decay and halo effects
   * Override for custom merge logic
   */
  protected mergeVibes(existing: Vibe[], newVibes: Vibe[]): Vibe[] {
    const vibeMap = new Map<string, Vibe>();
    const boostedVibes: Vibe[] = []; // Track vibes that were boosted (reappeared)

    // Add existing vibes
    for (const vibe of existing) {
      vibeMap.set(vibe.name.toLowerCase(), vibe);
    }

    // Merge or add new vibes
    for (const newVibe of newVibes) {
      const key = newVibe.name.toLowerCase();
      const existingVibe = vibeMap.get(key);

      if (existingVibe) {
        // Vibe reappeared! Merge and track for halo effect
        const mergedVibe = mergeVibeOccurrence(existingVibe, newVibe);
        vibeMap.set(key, mergedVibe);
        boostedVibes.push(mergedVibe);
      } else {
        vibeMap.set(key, newVibe);
      }
    }

    let mergedVibes = Array.from(vibeMap.values());

    // Apply halo effect: boosted vibes affect semantically similar vibes
    if (boostedVibes.length > 0) {
      console.log(`Applying halo effect for ${boostedVibes.length} boosted vibe(s)`);
      mergedVibes = applyMultipleHaloEffects(
        boostedVibes,
        mergedVibes,
        0.6,   // similarity threshold (0.6 = 60% similar)
        0.15   // max halo boost (15% of strength)
      );
    }

    return mergedVibes;
  }

  protected generateVibeId(name: string): string {
    // Use timestamp + random suffix to prevent collisions
    const random = Math.random().toString(36).substring(2, 8);
    return `vibe-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${random}`;
  }

  protected createVibe(partial: Partial<Vibe> & { name: string; description: string }): Vibe {
    const now = new Date();
    const vibe: Vibe = {
      id: this.generateVibeId(partial.name),
      category: 'trend',
      keywords: [],
      strength: 0.5,
      sentiment: 'neutral',
      timestamp: now,
      sources: [],
      firstSeen: now,
      lastSeen: now,
      currentRelevance: 0.5,
      ...partial,
    } as Vibe;

    // Set suggested half-life if not provided
    if (!vibe.halfLife) {
      vibe.halfLife = suggestHalfLife(vibe);
    }

    return vibe;
  }
}

/**
 * Analyzer Registry
 * Manages different analysis strategies
 */
export class AnalyzerRegistry {
  private analyzers: Map<string, Analyzer> = new Map();
  private primaryAnalyzer?: string;

  register(analyzer: Analyzer, isPrimary = false): void {
    this.analyzers.set(analyzer.name, analyzer);
    if (isPrimary) {
      this.primaryAnalyzer = analyzer.name;
    }
  }

  setPrimary(name: string): void {
    if (this.analyzers.has(name)) {
      this.primaryAnalyzer = name;
    }
  }

  get(name: string): Analyzer | undefined {
    return this.analyzers.get(name);
  }

  getPrimary(): Analyzer | undefined {
    return this.primaryAnalyzer
      ? this.analyzers.get(this.primaryAnalyzer)
      : this.analyzers.values().next().value;
  }

  getAll(): Analyzer[] {
    return Array.from(this.analyzers.values());
  }

  async analyzeWithPrimary(content: RawContent[]): Promise<Vibe[]> {
    const analyzer = this.getPrimary();
    if (!analyzer) {
      throw new Error('No analyzer available');
    }
    return analyzer.analyze(content);
  }

  async analyzeWithAll(content: RawContent[]): Promise<Map<string, Vibe[]>> {
    const results = new Map<string, Vibe[]>();

    await Promise.all(
      Array.from(this.analyzers.entries()).map(async ([name, analyzer]) => {
        try {
          const vibes = await analyzer.analyze(content);
          results.set(name, vibes);
        } catch (error) {
          console.error(`Analyzer ${name} failed:`, error);
          results.set(name, []);
        }
      })
    );

    return results;
  }

  async analyzeWithFallback(
    content: RawContent[],
    primaryName: string,
    fallbackName?: string
  ): Promise<Vibe[]> {
    const primary = this.analyzers.get(primaryName);
    if (!primary) {
      throw new Error(`Analyzer ${primaryName} not found`);
    }

    try {
      return await primary.analyze(content);
    } catch (error) {
      console.error(`Primary analyzer ${primaryName} failed:`, error);

      if (fallbackName) {
        const fallback = this.analyzers.get(fallbackName);
        if (fallback) {
          console.log(`Falling back to ${fallbackName}`);
          return await fallback.analyze(content);
        }
      }

      throw error;
    }
  }
}

// Global registry instance
export const analyzerRegistry = new AnalyzerRegistry();
