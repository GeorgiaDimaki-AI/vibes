import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_HALF_LIVES,
  calculateDecay,
  applyDecayToVibes,
  filterDecayedVibes,
  boostVibe,
  mergeVibeOccurrence,
  sortByRelevance,
  getTemporalStats,
  suggestHalfLife,
  applyHaloEffect,
  applyMultipleHaloEffects,
  findSimilarVibes,
} from '../temporal-decay';
import { createMockVibe, mockVibes } from '../__fixtures__/vibes';
import { Vibe } from '../types';

describe('temporal-decay', () => {
  describe('DEFAULT_HALF_LIVES', () => {
    it('should have correct half-lives for all categories', () => {
      expect(DEFAULT_HALF_LIVES.meme).toBe(3);
      expect(DEFAULT_HALF_LIVES.event).toBe(7);
      expect(DEFAULT_HALF_LIVES.trend).toBe(14);
      expect(DEFAULT_HALF_LIVES.topic).toBe(21);
      expect(DEFAULT_HALF_LIVES.sentiment).toBe(30);
      expect(DEFAULT_HALF_LIVES.aesthetic).toBe(60);
      expect(DEFAULT_HALF_LIVES.movement).toBe(90);
      expect(DEFAULT_HALF_LIVES.custom).toBe(14);
    });
  });

  describe('calculateDecay', () => {
    it('should return full strength for recently seen vibes', () => {
      const vibe = createMockVibe({
        strength: 0.8,
        lastSeen: new Date('2025-11-23T11:50:00Z'), // 10 minutes ago
      });
      const now = new Date('2025-11-23T12:00:00Z');

      const decay = calculateDecay(vibe, now);
      expect(decay).toBe(0.8);
    });

    it('should apply exponential decay based on half-life', () => {
      const vibe = createMockVibe({
        strength: 1.0,
        category: 'meme',
        halfLife: 3,
        lastSeen: new Date('2025-11-20T12:00:00Z'), // 3 days ago (1 half-life)
      });
      const now = new Date('2025-11-23T12:00:00Z');

      const decay = calculateDecay(vibe, now);
      expect(decay).toBeCloseTo(0.5, 2); // Should be ~50% after 1 half-life
    });

    it('should decay to ~25% after 2 half-lives', () => {
      const vibe = createMockVibe({
        strength: 1.0,
        category: 'meme',
        halfLife: 3,
        lastSeen: new Date('2025-11-17T12:00:00Z'), // 6 days ago (2 half-lives)
      });
      const now = new Date('2025-11-23T12:00:00Z');

      const decay = calculateDecay(vibe, now);
      expect(decay).toBeCloseTo(0.25, 2);
    });

    it('should use category default half-life if not specified', () => {
      const vibe = createMockVibe({
        strength: 1.0,
        category: 'trend',
        halfLife: undefined,
        lastSeen: new Date('2025-11-09T12:00:00Z'), // 14 days ago
      });
      const now = new Date('2025-11-23T12:00:00Z');

      const decay = calculateDecay(vibe, now);
      expect(decay).toBeCloseTo(0.5, 2); // trend default is 14 days
    });

    it('should use 14 days default for unknown categories', () => {
      const vibe = createMockVibe({
        strength: 1.0,
        category: 'custom',
        halfLife: undefined,
        lastSeen: new Date('2025-11-09T12:00:00Z'),
      });
      const now = new Date('2025-11-23T12:00:00Z');

      const decay = calculateDecay(vibe, now);
      expect(decay).toBeCloseTo(0.5, 2);
    });
  });

  describe('applyDecayToVibes', () => {
    it('should apply decay to all vibes in the list', () => {
      const vibes = [
        createMockVibe({
          id: '1',
          strength: 1.0,
          halfLife: 7,
          lastSeen: new Date('2025-11-16T12:00:00Z'), // 7 days ago
        }),
        createMockVibe({
          id: '2',
          strength: 1.0,
          halfLife: 14,
          lastSeen: new Date('2025-11-09T12:00:00Z'), // 14 days ago
        }),
      ];
      const now = new Date('2025-11-23T12:00:00Z');

      const decayedVibes = applyDecayToVibes(vibes, now);

      expect(decayedVibes[0].currentRelevance).toBeCloseTo(0.5, 2);
      expect(decayedVibes[1].currentRelevance).toBeCloseTo(0.5, 2);
    });

    it('should not modify original vibes', () => {
      const vibes = [createMockVibe({ strength: 1.0 })];
      const original = vibes[0].currentRelevance;

      applyDecayToVibes(vibes, new Date('2025-11-23T12:00:00Z'));

      expect(vibes[0].currentRelevance).toBe(original);
    });
  });

  describe('filterDecayedVibes', () => {
    it('should filter out vibes below threshold', () => {
      const vibes = [
        createMockVibe({
          id: '1',
          strength: 1.0,
          halfLife: 3,
          lastSeen: new Date('2025-11-20T12:00:00Z'), // 3 days - 50% decay
        }),
        createMockVibe({
          id: '2',
          strength: 1.0,
          halfLife: 3,
          lastSeen: new Date('2025-11-08T12:00:00Z'), // 15 days - ~3% decay
        }),
      ];
      const now = new Date('2025-11-23T12:00:00Z');

      const filtered = filterDecayedVibes(vibes, 0.05, now);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should use default threshold of 0.05', () => {
      const vibes = [
        createMockVibe({
          strength: 1.0,
          halfLife: 3,
          lastSeen: new Date('2025-11-08T12:00:00Z'), // Very old
        }),
      ];
      const now = new Date('2025-11-23T12:00:00Z');

      const filtered = filterDecayedVibes(vibes, undefined, now);

      expect(filtered.length).toBeLessThan(vibes.length);
    });

    it('should keep vibes exactly at threshold', () => {
      const vibes = [
        createMockVibe({
          strength: 1.0,
          halfLife: 1,
          lastSeen: new Date('2025-11-18T21:00:00Z'), // Decay to exactly ~0.05
        }),
      ];
      const now = new Date('2025-11-23T12:00:00Z');

      const filtered = filterDecayedVibes(vibes, 0.05, now);

      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('boostVibe', () => {
    it('should increase strength and currentRelevance', () => {
      const vibe = createMockVibe({
        strength: 0.6,
        currentRelevance: 0.5,
      });

      const boosted = boostVibe(vibe, 0.2);

      expect(boosted.strength).toBe(0.8);
      expect(boosted.currentRelevance).toBe(0.7);
    });

    it('should cap strength at 1.0', () => {
      const vibe = createMockVibe({
        strength: 0.9,
        currentRelevance: 0.9,
      });

      const boosted = boostVibe(vibe, 0.2);

      expect(boosted.strength).toBe(1.0);
      expect(boosted.currentRelevance).toBe(1.0);
    });

    it('should update lastSeen to current time', () => {
      const vibe = createMockVibe({
        lastSeen: new Date('2025-11-20T12:00:00Z'),
      });

      const boosted = boostVibe(vibe);
      const now = new Date();

      expect(boosted.lastSeen.getTime()).toBeGreaterThan(vibe.lastSeen.getTime());
      expect(boosted.lastSeen.getTime()).toBeCloseTo(now.getTime(), -2); // Within ~100ms
    });

    it('should use default boost amount of 0.2', () => {
      const vibe = createMockVibe({
        strength: 0.5,
      });

      const boosted = boostVibe(vibe);

      expect(boosted.strength).toBe(0.7);
    });
  });

  describe('mergeVibeOccurrence', () => {
    it('should boost existing vibe when seen again', () => {
      const existing = createMockVibe({
        id: '1',
        strength: 0.6,
        keywords: ['ai', 'tech'],
        sources: ['source1'],
        lastSeen: new Date('2025-11-20T12:00:00Z'),
      });

      const newVibe = createMockVibe({
        id: '1',
        keywords: ['ai', 'productivity'],
        sources: ['source2'],
      });

      const merged = mergeVibeOccurrence(existing, newVibe);

      expect(merged.strength).toBeGreaterThan(existing.strength);
      expect(merged.lastSeen.getTime()).toBeGreaterThan(existing.lastSeen.getTime());
    });

    it('should merge keywords and sources', () => {
      const existing = createMockVibe({
        keywords: ['ai', 'tech'],
        sources: ['source1'],
      });

      const newVibe = createMockVibe({
        keywords: ['ai', 'productivity'],
        sources: ['source2'],
      });

      const merged = mergeVibeOccurrence(existing, newVibe);

      expect(merged.keywords).toContain('ai');
      expect(merged.keywords).toContain('tech');
      expect(merged.keywords).toContain('productivity');
      expect(merged.sources).toContain('source1');
      expect(merged.sources).toContain('source2');
    });

    it('should merge related vibes', () => {
      const existing = createMockVibe({
        relatedVibes: ['vibe1'],
      });

      const newVibe = createMockVibe({
        relatedVibes: ['vibe2'],
      });

      const merged = mergeVibeOccurrence(existing, newVibe);

      expect(merged.relatedVibes).toContain('vibe1');
      expect(merged.relatedVibes).toContain('vibe2');
    });

    it('should apply larger boost if more time has passed', () => {
      const existingRecent = createMockVibe({
        strength: 0.5,
        lastSeen: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      });

      const existingOld = createMockVibe({
        strength: 0.5,
        lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
      });

      const newVibe = createMockVibe();

      const mergedRecent = mergeVibeOccurrence(existingRecent, newVibe);
      const mergedOld = mergeVibeOccurrence(existingOld, newVibe);

      expect(mergedOld.strength).toBeGreaterThan(mergedRecent.strength);
    });

    it('should cap boost at 0.3', () => {
      const existing = createMockVibe({
        strength: 0.5,
        lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 100), // 100 days ago
      });

      const newVibe = createMockVibe();
      const merged = mergeVibeOccurrence(existing, newVibe);
      const boost = merged.strength - existing.strength;

      expect(boost).toBeLessThanOrEqual(0.3);
    });
  });

  describe('sortByRelevance', () => {
    it('should sort vibes by current relevance descending', () => {
      const vibes = [
        createMockVibe({
          id: '1',
          strength: 1.0,
          halfLife: 7,
          lastSeen: new Date('2025-11-09T12:00:00Z'), // Old - low relevance
        }),
        createMockVibe({
          id: '2',
          strength: 1.0,
          halfLife: 7,
          lastSeen: new Date('2025-11-22T12:00:00Z'), // Recent - high relevance
        }),
        createMockVibe({
          id: '3',
          strength: 1.0,
          halfLife: 7,
          lastSeen: new Date('2025-11-16T12:00:00Z'), // Medium relevance
        }),
      ];
      const now = new Date('2025-11-23T12:00:00Z');

      const sorted = sortByRelevance(vibes, now);

      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('should update currentRelevance on all vibes', () => {
      const vibes = [createMockVibe()];
      const sorted = sortByRelevance(vibes, new Date());

      expect(sorted[0].currentRelevance).toBeDefined();
      expect(typeof sorted[0].currentRelevance).toBe('number');
    });
  });

  describe('getTemporalStats', () => {
    it('should calculate correct statistics', () => {
      const now = new Date('2025-11-23T12:00:00Z');
      const vibes = [
        createMockVibe({
          strength: 1.0,
          firstSeen: new Date('2025-11-20T12:00:00Z'), // 3 days old
          lastSeen: new Date('2025-11-23T12:00:00Z'), // 0 days since last seen
          halfLife: 7,
        }),
        createMockVibe({
          strength: 1.0,
          firstSeen: new Date('2025-11-13T12:00:00Z'), // 10 days old
          lastSeen: new Date('2025-11-16T12:00:00Z'), // 7 days since last seen
          halfLife: 7,
        }),
      ];

      const stats = getTemporalStats(vibes, now);

      expect(stats.totalVibes).toBe(2);
      expect(stats.averageAge).toBeCloseTo(6.5, 1);
      expect(stats.averageDaysSinceLastSeen).toBeCloseTo(3.5, 1);
      expect(stats.averageRelevance).toBeGreaterThan(0);
      expect(stats.highlyRelevant).toBeGreaterThanOrEqual(0);
      expect(stats.moderatelyRelevant).toBeGreaterThanOrEqual(0);
      expect(stats.lowRelevance).toBeGreaterThanOrEqual(0);
      expect(stats.decayed).toBeGreaterThanOrEqual(0);
    });

    it('should categorize vibes by relevance levels', () => {
      const now = new Date('2025-11-23T12:00:00Z');
      const vibes = [
        createMockVibe({
          strength: 1.0,
          lastSeen: new Date('2025-11-23T12:00:00Z'), // High: 1.0
          halfLife: 7,
        }),
        createMockVibe({
          strength: 1.0,
          lastSeen: new Date('2025-11-19T12:00:00Z'), // Moderate: ~0.76
          halfLife: 7,
        }),
        createMockVibe({
          strength: 1.0,
          lastSeen: new Date('2025-11-02T12:00:00Z'), // Low: ~0.09
          halfLife: 7,
        }),
        createMockVibe({
          strength: 1.0,
          lastSeen: new Date('2025-10-01T12:00:00Z'), // Decayed: <0.05
          halfLife: 7,
        }),
      ];

      const stats = getTemporalStats(vibes, now);

      expect(stats.highlyRelevant).toBeGreaterThanOrEqual(1);
      expect(stats.moderatelyRelevant).toBeGreaterThanOrEqual(1);
      expect(stats.lowRelevance).toBeGreaterThanOrEqual(1);
      expect(stats.decayed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('suggestHalfLife', () => {
    it('should use base half-life for category', () => {
      const vibe = createMockVibe({
        category: 'meme',
        strength: 1.0,
        sentiment: 'neutral',
        sources: ['source1'],
      });

      const halfLife = suggestHalfLife(vibe);

      expect(halfLife).toBeCloseTo(3 * 1.3, 1); // meme (3) * strengthMultiplier (1.3)
    });

    it('should increase half-life for stronger vibes', () => {
      const weakVibe = createMockVibe({
        category: 'trend',
        strength: 0.2,
        sentiment: 'neutral',
        sources: ['source1'],
      });

      const strongVibe = createMockVibe({
        category: 'trend',
        strength: 1.0,
        sentiment: 'neutral',
        sources: ['source1'],
      });

      const weakHalfLife = suggestHalfLife(weakVibe);
      const strongHalfLife = suggestHalfLife(strongVibe);

      expect(strongHalfLife).toBeGreaterThan(weakHalfLife);
    });

    it('should decrease half-life for mixed sentiment', () => {
      const neutralVibe = createMockVibe({
        category: 'trend',
        strength: 0.8,
        sentiment: 'neutral',
        sources: ['source1'],
      });

      const mixedVibe = createMockVibe({
        category: 'trend',
        strength: 0.8,
        sentiment: 'mixed',
        sources: ['source1'],
      });

      const neutralHalfLife = suggestHalfLife(neutralVibe);
      const mixedHalfLife = suggestHalfLife(mixedVibe);

      expect(mixedHalfLife).toBeLessThan(neutralHalfLife);
    });

    it('should increase half-life for vibes with more sources', () => {
      const fewSourcesVibe = createMockVibe({
        category: 'trend',
        strength: 0.8,
        sentiment: 'neutral',
        sources: ['source1'],
      });

      const manySourcesVibe = createMockVibe({
        category: 'trend',
        strength: 0.8,
        sentiment: 'neutral',
        sources: ['s1', 's2', 's3', 's4', 's5'],
      });

      const fewHalfLife = suggestHalfLife(fewSourcesVibe);
      const manyHalfLife = suggestHalfLife(manySourcesVibe);

      expect(manyHalfLife).toBeGreaterThan(fewHalfLife);
    });
  });

  describe('applyHaloEffect', () => {
    it('should boost similar vibes', () => {
      const boostedVibe = createMockVibe({
        id: 'boosted',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const similarVibe = createMockVibe({
        id: 'similar',
        strength: 0.5,
        currentRelevance: 0.5,
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.05)), // Similar
      });

      const allVibes = [boostedVibe, similarVibe];
      const result = applyHaloEffect(boostedVibe, allVibes, 0.6, 0.15);

      const updatedSimilar = result.find(v => v.id === 'similar')!;
      expect(updatedSimilar.strength).toBeGreaterThan(similarVibe.strength);
    });

    it('should not boost dissimilar vibes', () => {
      const boostedVibe = createMockVibe({
        id: 'boosted',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const dissimilarVibe = createMockVibe({
        id: 'dissimilar',
        strength: 0.5,
        embedding: Array(1536).fill(0).map((_, i) => Math.cos(i * 0.5)), // Very different
      });

      const allVibes = [boostedVibe, dissimilarVibe];
      const result = applyHaloEffect(boostedVibe, allVibes, 0.6, 0.15);

      const updatedDissimilar = result.find(v => v.id === 'dissimilar')!;
      expect(updatedDissimilar.strength).toBe(dissimilarVibe.strength);
    });

    it('should not boost the boosted vibe itself', () => {
      const boostedVibe = createMockVibe({
        id: 'boosted',
        strength: 0.6,
        embedding: Array(1536).fill(1),
      });

      const allVibes = [boostedVibe];
      const result = applyHaloEffect(boostedVibe, allVibes);

      expect(result[0].strength).toBe(0.6);
    });

    it('should skip vibes without embeddings', () => {
      const boostedVibe = createMockVibe({
        id: 'boosted',
        embedding: Array(1536).fill(1),
      });

      const noEmbeddingVibe = createMockVibe({
        id: 'no-embedding',
        strength: 0.5,
        embedding: undefined,
      });

      const allVibes = [boostedVibe, noEmbeddingVibe];
      const result = applyHaloEffect(boostedVibe, allVibes);

      const updated = result.find(v => v.id === 'no-embedding')!;
      expect(updated.strength).toBe(0.5);
    });

    it('should return unchanged vibes if boosted vibe has no embedding', () => {
      const boostedVibe = createMockVibe({
        id: 'boosted',
        embedding: undefined,
      });

      const otherVibe = createMockVibe({
        id: 'other',
        strength: 0.5,
        embedding: Array(1536).fill(1),
      });

      const allVibes = [boostedVibe, otherVibe];
      const result = applyHaloEffect(boostedVibe, allVibes);

      expect(result).toEqual(allVibes);
    });

    it('should track halo boost in metadata', () => {
      const boostedVibe = createMockVibe({
        id: 'boosted',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const similarVibe = createMockVibe({
        id: 'similar',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.05)),
      });

      const allVibes = [boostedVibe, similarVibe];
      const result = applyHaloEffect(boostedVibe, allVibes, 0.6, 0.15);

      const updated = result.find(v => v.id === 'similar')!;
      expect(updated.metadata?.lastHaloBoost).toBeDefined();
      expect(updated.metadata?.lastHaloBoost.from).toBe('boosted');
    });
  });

  describe('applyMultipleHaloEffects', () => {
    it('should apply halo effects from multiple boosted vibes', () => {
      const boosted1 = createMockVibe({
        id: 'boosted1',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const boosted2 = createMockVibe({
        id: 'boosted2',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.15)),
      });

      const similarVibe = createMockVibe({
        id: 'similar',
        strength: 0.5,
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.12)), // Similar to both
      });

      const allVibes = [boosted1, boosted2, similarVibe];
      const result = applyMultipleHaloEffects([boosted1, boosted2], allVibes, 0.5, 0.1);

      const updated = result.find(v => v.id === 'similar')!;
      expect(updated.strength).toBeGreaterThan(0.5);
    });

    it('should handle empty boosted vibes array', () => {
      const allVibes = [createMockVibe()];
      const result = applyMultipleHaloEffects([], allVibes);

      expect(result).toHaveLength(1);
    });
  });

  describe('findSimilarVibes', () => {
    it('should find similar vibes by embedding', () => {
      const targetVibe = createMockVibe({
        id: 'target',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const similar1 = createMockVibe({
        id: 'similar1',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.05)),
      });

      const similar2 = createMockVibe({
        id: 'similar2',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.1)),
      });

      const dissimilar = createMockVibe({
        id: 'dissimilar',
        embedding: Array(1536).fill(0).map((_, i) => Math.cos(i * 0.5)),
      });

      const allVibes = [targetVibe, similar1, similar2, dissimilar];
      const results = findSimilarVibes(targetVibe, allVibes, 10, 0.5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.5);
      expect(results.every(r => r.vibe.id !== 'target')).toBe(true);
    });

    it('should return empty array if target has no embedding', () => {
      const targetVibe = createMockVibe({
        id: 'target',
        embedding: undefined,
      });

      const otherVibe = createMockVibe({
        id: 'other',
        embedding: Array(1536).fill(1),
      });

      const results = findSimilarVibes(targetVibe, [targetVibe, otherVibe]);

      expect(results).toHaveLength(0);
    });

    it('should limit results to topK', () => {
      const targetVibe = createMockVibe({
        id: 'target',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const similarVibes = Array(20).fill(0).map((_, i) =>
        createMockVibe({
          id: `similar-${i}`,
          embedding: Array(1536).fill(0).map((_, j) => Math.sin(j * 0.1 + i * 0.01)),
        })
      );

      const allVibes = [targetVibe, ...similarVibes];
      const results = findSimilarVibes(targetVibe, allVibes, 5, 0.5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should sort by similarity descending', () => {
      const targetVibe = createMockVibe({
        id: 'target',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const vibes = Array(5).fill(0).map((_, i) =>
        createMockVibe({
          id: `vibe-${i}`,
          embedding: Array(1536).fill(0).map((_, j) => Math.sin(j * 0.1 + i * 0.02)),
        })
      );

      const allVibes = [targetVibe, ...vibes];
      const results = findSimilarVibes(targetVibe, allVibes, 10, 0.5);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should filter by minimum similarity', () => {
      const targetVibe = createMockVibe({
        id: 'target',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      const dissimilarVibe = createMockVibe({
        id: 'dissimilar',
        embedding: Array(1536).fill(0).map((_, i) => Math.cos(i * 0.5)),
      });

      const allVibes = [targetVibe, dissimilarVibe];
      const results = findSimilarVibes(targetVibe, allVibes, 10, 0.9);

      expect(results.every(r => r.similarity >= 0.9)).toBe(true);
    });
  });
});
