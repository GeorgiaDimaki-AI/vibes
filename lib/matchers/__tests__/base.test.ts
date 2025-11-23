import { describe, it, expect, beforeEach } from 'vitest';
import { BaseMatcher, MatcherRegistry } from '../base';
import { Matcher, Scenario, CulturalGraph, VibeMatch } from '@/lib/types';
import { createMockVibe, mockVibes } from '@/lib/__fixtures__/vibes';
import { mockScenario } from '@/lib/__fixtures__/scenarios';

// Mock matcher implementation
class MockMatcher extends BaseMatcher {
  readonly name = 'mock';
  readonly description = 'Mock matcher for testing';

  async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    const matches: VibeMatch[] = [];

    for (const vibe of graph.vibes.values()) {
      // Simple keyword-based matching
      const keywords = scenario.description.toLowerCase().split(' ');
      const vibeKeywords = vibe.keywords.map(k => k.toLowerCase());

      const matchCount = keywords.filter(k => vibeKeywords.includes(k)).length;
      if (matchCount > 0) {
        matches.push({
          vibe,
          relevanceScore: matchCount / keywords.length,
          reasoning: `Matched ${matchCount} keywords`,
        });
      }
    }

    return this.sortByRelevance(matches);
  }
}

// Matcher that returns fixed results
class FixedMatcher extends BaseMatcher {
  readonly name = 'fixed';
  readonly description = 'Returns fixed matches';

  constructor(private matches: VibeMatch[]) {
    super();
  }

  async match(): Promise<VibeMatch[]> {
    return this.matches;
  }
}

// Matcher that throws errors
class ErrorMatcher extends BaseMatcher {
  readonly name = 'error';
  readonly description = 'Error matcher';

  async match(): Promise<VibeMatch[]> {
    throw new Error('Matching failed');
  }
}

// Matcher that returns empty results
class EmptyMatcher extends BaseMatcher {
  readonly name = 'empty';
  readonly description = 'Empty matcher';

  async match(): Promise<VibeMatch[]> {
    return [];
  }
}

describe('BaseMatcher', () => {
  let matcher: MockMatcher;
  let mockGraph: CulturalGraph;

  beforeEach(() => {
    matcher = new MockMatcher();
    mockGraph = {
      vibes: new Map(mockVibes.map(v => [v.id, v])),
      edges: [],
      metadata: {
        lastUpdated: new Date(),
        vibeCount: mockVibes.length,
        version: '1.0',
      },
    };
  });

  describe('match', () => {
    it('should match scenario to vibes', async () => {
      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches.length).toBeGreaterThanOrEqual(0);
      if (matches.length > 0) {
        expect(matches[0].vibe).toBeDefined();
        expect(matches[0].relevanceScore).toBeGreaterThan(0);
        expect(matches[0].reasoning).toBeDefined();
      }
    });
  });

  describe('sortByRelevance', () => {
    it('should sort matches by relevance score descending', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.3, reasoning: 'Low' },
        { vibe: createMockVibe(), relevanceScore: 0.9, reasoning: 'High' },
        { vibe: createMockVibe(), relevanceScore: 0.6, reasoning: 'Medium' },
      ];

      const sorted = matcher['sortByRelevance'](matches);

      expect(sorted[0].relevanceScore).toBe(0.9);
      expect(sorted[1].relevanceScore).toBe(0.6);
      expect(sorted[2].relevanceScore).toBe(0.3);
    });

    it('should handle empty array', () => {
      const sorted = matcher['sortByRelevance']([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single match', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.5, reasoning: 'Test' },
      ];

      const sorted = matcher['sortByRelevance'](matches);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].relevanceScore).toBe(0.5);
    });

    it('should maintain order for equal scores', () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });
      const vibe2 = createMockVibe({ id: 'vibe-2' });

      const matches: VibeMatch[] = [
        { vibe: vibe1, relevanceScore: 0.5, reasoning: 'First' },
        { vibe: vibe2, relevanceScore: 0.5, reasoning: 'Second' },
      ];

      const sorted = matcher['sortByRelevance'](matches);
      expect(sorted[0].vibe.id).toBe('vibe-1');
      expect(sorted[1].vibe.id).toBe('vibe-2');
    });
  });

  describe('topN', () => {
    it('should return top N matches', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.3, reasoning: 'Low' },
        { vibe: createMockVibe(), relevanceScore: 0.9, reasoning: 'High' },
        { vibe: createMockVibe(), relevanceScore: 0.6, reasoning: 'Medium' },
        { vibe: createMockVibe(), relevanceScore: 0.8, reasoning: 'High-medium' },
      ];

      const topTwo = matcher['topN'](matches, 2);

      expect(topTwo).toHaveLength(2);
      expect(topTwo[0].relevanceScore).toBe(0.9);
      expect(topTwo[1].relevanceScore).toBe(0.8);
    });

    it('should return all matches if N is larger than array', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.5, reasoning: 'Test' },
      ];

      const top = matcher['topN'](matches, 10);
      expect(top).toHaveLength(1);
    });

    it('should handle zero N', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.5, reasoning: 'Test' },
      ];

      const top = matcher['topN'](matches, 0);
      expect(top).toEqual([]);
    });

    it('should handle empty array', () => {
      const top = matcher['topN']([], 5);
      expect(top).toEqual([]);
    });
  });

  describe('filterByThreshold', () => {
    it('should filter matches above threshold', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.3, reasoning: 'Low' },
        { vibe: createMockVibe(), relevanceScore: 0.7, reasoning: 'High' },
        { vibe: createMockVibe(), relevanceScore: 0.5, reasoning: 'Medium' },
      ];

      const filtered = matcher['filterByThreshold'](matches, 0.5);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(m => m.relevanceScore >= 0.5)).toBe(true);
    });

    it('should include matches exactly at threshold', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.5, reasoning: 'Exact' },
        { vibe: createMockVibe(), relevanceScore: 0.4, reasoning: 'Below' },
      ];

      const filtered = matcher['filterByThreshold'](matches, 0.5);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].relevanceScore).toBe(0.5);
    });

    it('should return empty array if no matches above threshold', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0.3, reasoning: 'Low' },
        { vibe: createMockVibe(), relevanceScore: 0.4, reasoning: 'Low' },
      ];

      const filtered = matcher['filterByThreshold'](matches, 0.9);
      expect(filtered).toEqual([]);
    });

    it('should handle empty array', () => {
      const filtered = matcher['filterByThreshold']([], 0.5);
      expect(filtered).toEqual([]);
    });

    it('should handle threshold of 0', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 0, reasoning: 'Zero' },
        { vibe: createMockVibe(), relevanceScore: 0.1, reasoning: 'Low' },
      ];

      const filtered = matcher['filterByThreshold'](matches, 0);

      expect(filtered).toHaveLength(2);
    });

    it('should handle threshold of 1', () => {
      const matches: VibeMatch[] = [
        { vibe: createMockVibe(), relevanceScore: 1.0, reasoning: 'Perfect' },
        { vibe: createMockVibe(), relevanceScore: 0.99, reasoning: 'Almost' },
      ];

      const filtered = matcher['filterByThreshold'](matches, 1.0);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].relevanceScore).toBe(1.0);
    });
  });
});

describe('MatcherRegistry', () => {
  let registry: MatcherRegistry;
  let mockMatcher: MockMatcher;
  let emptyMatcher: EmptyMatcher;
  let errorMatcher: ErrorMatcher;
  let mockGraph: CulturalGraph;

  beforeEach(() => {
    registry = new MatcherRegistry();
    mockMatcher = new MockMatcher();
    emptyMatcher = new EmptyMatcher();
    errorMatcher = new ErrorMatcher();

    mockGraph = {
      vibes: new Map(mockVibes.map(v => [v.id, v])),
      edges: [],
      metadata: {
        lastUpdated: new Date(),
        vibeCount: mockVibes.length,
        version: '1.0',
      },
    };
  });

  describe('register and get', () => {
    it('should register and retrieve matchers', () => {
      registry.register(mockMatcher);
      const retrieved = registry.get('mock');

      expect(retrieved).toBe(mockMatcher);
    });

    it('should return undefined for non-existent matcher', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should allow registering as default', () => {
      registry.register(mockMatcher, true);
      const defaultMatcher = registry.getDefault();

      expect(defaultMatcher).toBe(mockMatcher);
    });

    it('should override matcher with same name', () => {
      const matcher1 = new MockMatcher();
      const matcher2 = new MockMatcher();

      registry.register(matcher1);
      registry.register(matcher2);

      expect(registry.get('mock')).toBe(matcher2);
    });
  });

  describe('setDefault', () => {
    it('should set default matcher', () => {
      registry.register(mockMatcher);
      registry.register(emptyMatcher);

      registry.setDefault('empty');
      const defaultMatcher = registry.getDefault();

      expect(defaultMatcher).toBe(emptyMatcher);
    });

    it('should not set default if matcher does not exist', () => {
      registry.register(mockMatcher, true);
      registry.setDefault('non-existent');

      const defaultMatcher = registry.getDefault();
      expect(defaultMatcher).toBe(mockMatcher); // Unchanged
    });
  });

  describe('getDefault', () => {
    it('should return default matcher', () => {
      registry.register(mockMatcher, true);
      const defaultMatcher = registry.getDefault();

      expect(defaultMatcher).toBe(mockMatcher);
    });

    it('should return first matcher if no default set', () => {
      registry.register(mockMatcher);
      registry.register(emptyMatcher);

      const defaultMatcher = registry.getDefault();
      expect(defaultMatcher).toBeDefined();
    });

    it('should return undefined if no matchers registered', () => {
      const defaultMatcher = registry.getDefault();
      expect(defaultMatcher).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered matchers', () => {
      registry.register(mockMatcher);
      registry.register(emptyMatcher);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContain(mockMatcher);
      expect(all).toContain(emptyMatcher);
    });

    it('should return empty array when no matchers', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('matchWithDefault', () => {
    it('should match using default matcher', async () => {
      registry.register(mockMatcher, true);

      const matches = await registry.matchWithDefault(mockScenario, mockGraph);

      expect(Array.isArray(matches)).toBe(true);
    });

    it('should throw error if no matcher available', async () => {
      await expect(registry.matchWithDefault(mockScenario, mockGraph)).rejects.toThrow(
        'No matcher available'
      );
    });

    it('should use first matcher if no default set', async () => {
      registry.register(mockMatcher);

      const matches = await registry.matchWithDefault(mockScenario, mockGraph);

      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('matchWith', () => {
    it('should match with specified matcher', async () => {
      registry.register(mockMatcher);
      registry.register(emptyMatcher);

      const matches = await registry.matchWith('mock', mockScenario, mockGraph);

      expect(Array.isArray(matches)).toBe(true);
    });

    it('should throw error if matcher not found', async () => {
      await expect(
        registry.matchWith('non-existent', mockScenario, mockGraph)
      ).rejects.toThrow('Matcher non-existent not found');
    });
  });

  describe('matchWithMultiple', () => {
    it('should combine results from multiple matchers', async () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });
      const vibe2 = createMockVibe({ id: 'vibe-2' });

      const matcher1 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.8, reasoning: 'Matcher 1' },
      ]);
      (matcher1 as any).name = 'matcher1';

      const matcher2 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.6, reasoning: 'Matcher 2' },
        { vibe: vibe2, relevanceScore: 0.7, reasoning: 'Matcher 2' },
      ]);
      (matcher2 as any).name = 'matcher2';

      registry.register(matcher1);
      registry.register(matcher2);

      const matches = await registry.matchWithMultiple(
        ['matcher1', 'matcher2'],
        mockScenario,
        mockGraph
      );

      expect(matches.length).toBe(2); // vibe1 and vibe2
      expect(matches[0].vibe.id).toBe('vibe-1'); // Higher avg score
    });

    it('should apply weights to scores', async () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });

      const matcher1 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.5, reasoning: 'M1' },
      ]);
      (matcher1 as any).name = 'matcher1';

      const matcher2 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.5, reasoning: 'M2' },
      ]);
      (matcher2 as any).name = 'matcher2';

      registry.register(matcher1);
      registry.register(matcher2);

      const weights = new Map([
        ['matcher1', 2.0],
        ['matcher2', 1.0],
      ]);

      const matches = await registry.matchWithMultiple(
        ['matcher1', 'matcher2'],
        mockScenario,
        mockGraph,
        weights
      );

      // Average: (0.5*2.0 + 0.5*1.0) / 2 = 0.75
      expect(matches[0].relevanceScore).toBeCloseTo(0.75, 2);
    });

    it('should use default weight of 1.0 when not specified', async () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });

      const matcher1 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.6, reasoning: 'M1' },
      ]);
      (matcher1 as any).name = 'matcher1';

      const matcher2 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.8, reasoning: 'M2' },
      ]);
      (matcher2 as any).name = 'matcher2';

      registry.register(matcher1);
      registry.register(matcher2);

      const matches = await registry.matchWithMultiple(
        ['matcher1', 'matcher2'],
        mockScenario,
        mockGraph
      );

      // Average: (0.6 + 0.8) / 2 = 0.7
      expect(matches[0].relevanceScore).toBeCloseTo(0.7, 2);
    });

    it('should sort combined results by score', async () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });
      const vibe2 = createMockVibe({ id: 'vibe-2' });

      const matcher = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.5, reasoning: 'Test' },
        { vibe: vibe2, relevanceScore: 0.9, reasoning: 'Test' },
      ]);
      (matcher as any).name = 'test';

      registry.register(matcher);

      const matches = await registry.matchWithMultiple(
        ['test'],
        mockScenario,
        mockGraph
      );

      expect(matches[0].vibe.id).toBe('vibe-2');
      expect(matches[1].vibe.id).toBe('vibe-1');
    });

    it('should throw error if no valid matchers found', async () => {
      await expect(
        registry.matchWithMultiple(['non-existent'], mockScenario, mockGraph)
      ).rejects.toThrow('No valid matchers found');
    });

    it('should skip invalid matcher names', async () => {
      registry.register(mockMatcher);

      const matches = await registry.matchWithMultiple(
        ['mock', 'non-existent'],
        mockScenario,
        mockGraph
      );

      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('matchWithEnsemble', () => {
    it('should take top N from each matcher', async () => {
      const vibes = Array(20).fill(0).map((_, i) => createMockVibe({ id: `vibe-${i}` }));

      const matcher1 = new FixedMatcher(
        vibes.slice(0, 15).map((v, i) => ({
          vibe: v,
          relevanceScore: 1.0 - i * 0.05,
          reasoning: 'M1',
        }))
      );
      (matcher1 as any).name = 'matcher1';

      const matcher2 = new FixedMatcher(
        vibes.slice(5, 20).map((v, i) => ({
          vibe: v,
          relevanceScore: 1.0 - i * 0.05,
          reasoning: 'M2',
        }))
      );
      (matcher2 as any).name = 'matcher2';

      registry.register(matcher1);
      registry.register(matcher2);

      const matches = await registry.matchWithEnsemble(
        ['matcher1', 'matcher2'],
        mockScenario,
        mockGraph,
        5
      );

      // Should have at most 10 unique vibes (5 from each)
      expect(matches.length).toBeLessThanOrEqual(10);
    });

    it('should deduplicate vibes across matchers', async () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });

      const matcher1 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.8, reasoning: 'M1' },
      ]);
      (matcher1 as any).name = 'matcher1';

      const matcher2 = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.7, reasoning: 'M2' },
      ]);
      (matcher2 as any).name = 'matcher2';

      registry.register(matcher1);
      registry.register(matcher2);

      const matches = await registry.matchWithEnsemble(
        ['matcher1', 'matcher2'],
        mockScenario,
        mockGraph,
        5
      );

      expect(matches).toHaveLength(1); // Deduplicated
    });

    it('should sort ensemble results by relevance', async () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });
      const vibe2 = createMockVibe({ id: 'vibe-2' });

      const matcher = new FixedMatcher([
        { vibe: vibe1, relevanceScore: 0.5, reasoning: 'Test' },
        { vibe: vibe2, relevanceScore: 0.9, reasoning: 'Test' },
      ]);
      (matcher as any).name = 'test';

      registry.register(matcher);

      const matches = await registry.matchWithEnsemble(
        ['test'],
        mockScenario,
        mockGraph,
        5
      );

      expect(matches[0].vibe.id).toBe('vibe-2');
      expect(matches[1].vibe.id).toBe('vibe-1');
    });

    it('should handle empty matcher results', async () => {
      registry.register(emptyMatcher);

      const matches = await registry.matchWithEnsemble(
        ['empty'],
        mockScenario,
        mockGraph,
        5
      );

      expect(matches).toEqual([]);
    });

    it('should use default topN of 10', async () => {
      const vibes = Array(15).fill(0).map((_, i) => createMockVibe({ id: `vibe-${i}` }));

      const matcher = new FixedMatcher(
        vibes.map((v, i) => ({
          vibe: v,
          relevanceScore: 1.0 - i * 0.05,
          reasoning: 'Test',
        }))
      );
      (matcher as any).name = 'test';

      registry.register(matcher);

      const matches = await registry.matchWithEnsemble(
        ['test'],
        mockScenario,
        mockGraph
      );

      expect(matches.length).toBeLessThanOrEqual(10);
    });
  });
});
