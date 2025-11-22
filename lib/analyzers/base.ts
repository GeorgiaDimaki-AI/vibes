/**
 * Base analyzer implementations and registry
 */

import { Analyzer, RawContent, Vibe } from '@/lib/types';

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
   * Helper to merge existing and new vibes
   * Override for custom merge logic
   */
  protected mergeVibes(existing: Vibe[], newVibes: Vibe[]): Vibe[] {
    const vibeMap = new Map<string, Vibe>();

    // Add existing vibes
    for (const vibe of existing) {
      vibeMap.set(vibe.name.toLowerCase(), vibe);
    }

    // Merge or add new vibes
    for (const newVibe of newVibes) {
      const key = newVibe.name.toLowerCase();
      const existingVibe = vibeMap.get(key);

      if (existingVibe) {
        // Merge: boost strength, combine keywords, update timestamp
        vibeMap.set(key, {
          ...existingVibe,
          strength: Math.min(1, existingVibe.strength + newVibe.strength * 0.3),
          keywords: Array.from(new Set([...existingVibe.keywords, ...newVibe.keywords])),
          sources: Array.from(new Set([...existingVibe.sources, ...newVibe.sources])),
          timestamp: new Date(),
          relatedVibes: Array.from(new Set([
            ...(existingVibe.relatedVibes || []),
            ...(newVibe.relatedVibes || [])
          ])),
        });
      } else {
        vibeMap.set(key, newVibe);
      }
    }

    return Array.from(vibeMap.values());
  }

  protected generateVibeId(name: string): string {
    return `vibe-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  }

  protected createVibe(partial: Partial<Vibe> & { name: string; description: string }): Vibe {
    return {
      id: this.generateVibeId(partial.name),
      category: 'trend',
      keywords: [],
      strength: 0.5,
      sentiment: 'neutral',
      timestamp: new Date(),
      sources: [],
      ...partial,
    } as Vibe;
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
