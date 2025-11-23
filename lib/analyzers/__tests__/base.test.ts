import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseAnalyzer, AnalyzerRegistry } from '../base';
import { Analyzer, RawContent, Vibe } from '@/lib/types';
import { createMockVibe } from '@/lib/__fixtures__/vibes';
import { mockRawContentList } from '@/lib/__fixtures__/raw-content';

// Mock the temporal-decay module
vi.mock('@/lib/temporal-decay', async () => {
  const actual = await vi.importActual('@/lib/temporal-decay');
  return {
    ...actual,
    mergeVibeOccurrence: vi.fn((existing: Vibe, newVibe: Vibe) => ({
      ...existing,
      strength: Math.min(existing.strength + 0.2, 1.0),
      lastSeen: new Date(),
    })),
    suggestHalfLife: vi.fn((vibe: Vibe) => 14),
    applyMultipleHaloEffects: vi.fn((boosted: Vibe[], all: Vibe[]) => all),
  };
});

// Mock analyzer implementation
class MockAnalyzer extends BaseAnalyzer {
  readonly name = 'mock';
  readonly description = 'Mock analyzer for testing';

  async analyze(content: RawContent[]): Promise<Vibe[]> {
    return content.map((c, idx) =>
      this.createVibe({
        name: c.title || `Vibe ${idx}`,
        description: c.body || 'Mock vibe',
        keywords: [c.source],
        sources: [c.url || c.source],
      })
    );
  }
}

// Analyzer that returns empty results
class EmptyAnalyzer extends BaseAnalyzer {
  readonly name = 'empty';
  readonly description = 'Empty analyzer';

  async analyze(): Promise<Vibe[]> {
    return [];
  }
}

// Analyzer that throws errors
class ErrorAnalyzer extends BaseAnalyzer {
  readonly name = 'error';
  readonly description = 'Error analyzer';

  async analyze(): Promise<Vibe[]> {
    throw new Error('Analysis failed');
  }
}

describe('BaseAnalyzer', () => {
  let analyzer: MockAnalyzer;

  beforeEach(() => {
    analyzer = new MockAnalyzer();
    vi.clearAllMocks();
  });

  describe('analyze', () => {
    it('should analyze content and return vibes', async () => {
      const vibes = await analyzer.analyze(mockRawContentList);

      expect(vibes.length).toBeGreaterThan(0);
      expect(vibes[0].name).toBeDefined();
      expect(vibes[0].description).toBeDefined();
    });

    it('should return empty array for empty content', async () => {
      const vibes = await analyzer.analyze([]);
      expect(vibes).toEqual([]);
    });
  });

  describe('generateVibeId', () => {
    it('should generate unique IDs from vibe name', () => {
      const id1 = analyzer['generateVibeId']('Test Vibe');
      const id2 = analyzer['generateVibeId']('Test Vibe');

      expect(id1).toContain('vibe-test-vibe');
      expect(id1).not.toBe(id2); // Should be unique due to timestamp + random
    });

    it('should normalize vibe names', () => {
      const id1 = analyzer['generateVibeId']('Test Vibe Name');
      const id2 = analyzer['generateVibeId']('test vibe name');

      expect(id1).toContain('test-vibe-name');
      expect(id2).toContain('test-vibe-name');
    });

    it('should replace spaces with hyphens', () => {
      const id = analyzer['generateVibeId']('Multi Word Name');
      expect(id).toContain('multi-word-name');
    });
  });

  describe('createVibe', () => {
    it('should create vibe with required fields', () => {
      const vibe = analyzer['createVibe']({
        name: 'Test Vibe',
        description: 'Test description',
      });

      expect(vibe.id).toBeDefined();
      expect(vibe.name).toBe('Test Vibe');
      expect(vibe.description).toBe('Test description');
      expect(vibe.category).toBe('trend');
      expect(vibe.strength).toBe(0.5);
      expect(vibe.sentiment).toBe('neutral');
      expect(vibe.keywords).toEqual([]);
      expect(vibe.sources).toEqual([]);
      expect(vibe.timestamp).toBeInstanceOf(Date);
      expect(vibe.firstSeen).toBeInstanceOf(Date);
      expect(vibe.lastSeen).toBeInstanceOf(Date);
      expect(vibe.currentRelevance).toBe(0.5);
    });

    it('should allow overriding default values', () => {
      const vibe = analyzer['createVibe']({
        name: 'Custom Vibe',
        description: 'Custom description',
        category: 'meme',
        strength: 0.9,
        sentiment: 'positive',
        keywords: ['test', 'custom'],
      });

      expect(vibe.category).toBe('meme');
      expect(vibe.strength).toBe(0.9);
      expect(vibe.sentiment).toBe('positive');
      expect(vibe.keywords).toContain('test');
      expect(vibe.keywords).toContain('custom');
    });

    it('should set suggested half-life if not provided', () => {
      const vibe = analyzer['createVibe']({
        name: 'Test Vibe',
        description: 'Test',
      });

      expect(vibe.halfLife).toBe(14); // From mocked suggestHalfLife
    });

    it('should not override provided half-life', () => {
      const vibe = analyzer['createVibe']({
        name: 'Test Vibe',
        description: 'Test',
        halfLife: 30,
      });

      expect(vibe.halfLife).toBe(30);
    });

    it('should set firstSeen and lastSeen to same timestamp', () => {
      const vibe = analyzer['createVibe']({
        name: 'Test Vibe',
        description: 'Test',
      });

      expect(vibe.firstSeen.getTime()).toBe(vibe.lastSeen.getTime());
    });
  });

  describe('update', () => {
    it('should analyze new content and merge with existing vibes', async () => {
      const existingVibes = [
        createMockVibe({ id: 'vibe-1', name: 'Existing Vibe', strength: 0.5 }),
      ];

      const result = await analyzer.update(existingVibes, mockRawContentList);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty existing vibes', async () => {
      const result = await analyzer.update([], mockRawContentList);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty new content', async () => {
      const existingVibes = [createMockVibe()];

      const result = await analyzer.update(existingVibes, []);

      expect(result.length).toBe(1);
    });
  });

  describe('mergeVibes', () => {
    it('should merge vibes with same name', () => {
      const existing = [
        createMockVibe({ id: 'vibe-1', name: 'Test Vibe', strength: 0.5 }),
      ];

      const newVibes = [
        createMockVibe({ id: 'vibe-2', name: 'Test Vibe', strength: 0.6 }),
      ];

      const merged = analyzer['mergeVibes'](existing, newVibes);

      expect(merged).toHaveLength(1);
      expect(merged[0].strength).toBeGreaterThan(0.5); // Boosted by merge
    });

    it('should be case-insensitive when merging', () => {
      const existing = [
        createMockVibe({ name: 'test vibe', strength: 0.5 }),
      ];

      const newVibes = [
        createMockVibe({ name: 'TEST VIBE', strength: 0.6 }),
      ];

      const merged = analyzer['mergeVibes'](existing, newVibes);

      expect(merged).toHaveLength(1);
    });

    it('should add new vibes that do not exist', () => {
      const existing = [
        createMockVibe({ name: 'Existing Vibe' }),
      ];

      const newVibes = [
        createMockVibe({ name: 'New Vibe' }),
      ];

      const merged = analyzer['mergeVibes'](existing, newVibes);

      expect(merged).toHaveLength(2);
      expect(merged.map(v => v.name)).toContain('Existing Vibe');
      expect(merged.map(v => v.name)).toContain('New Vibe');
    });

    it('should track boosted vibes for halo effect', async () => {
      const existing = [
        createMockVibe({ name: 'Test Vibe', strength: 0.5 }),
      ];

      const newVibes = [
        createMockVibe({ name: 'Test Vibe', strength: 0.6 }),
      ];

      const { applyMultipleHaloEffects } = await import('@/lib/temporal-decay');

      analyzer['mergeVibes'](existing, newVibes);

      expect(applyMultipleHaloEffects).toHaveBeenCalled();
    });

    it('should handle multiple reappearing vibes', () => {
      const existing = [
        createMockVibe({ name: 'Vibe 1', strength: 0.5 }),
        createMockVibe({ name: 'Vibe 2', strength: 0.6 }),
      ];

      const newVibes = [
        createMockVibe({ name: 'Vibe 1' }),
        createMockVibe({ name: 'Vibe 2' }),
      ];

      const merged = analyzer['mergeVibes'](existing, newVibes);

      expect(merged).toHaveLength(2);
    });

    it('should not apply halo effect when no vibes boosted', async () => {
      const existing = [
        createMockVibe({ name: 'Existing' }),
      ];

      const newVibes = [
        createMockVibe({ name: 'New' }),
      ];

      const { applyMultipleHaloEffects } = await import('@/lib/temporal-decay');
      vi.mocked(applyMultipleHaloEffects).mockClear();

      analyzer['mergeVibes'](existing, newVibes);

      expect(applyMultipleHaloEffects).not.toHaveBeenCalled();
    });
  });
});

describe('AnalyzerRegistry', () => {
  let registry: AnalyzerRegistry;
  let mockAnalyzer: MockAnalyzer;
  let emptyAnalyzer: EmptyAnalyzer;
  let errorAnalyzer: ErrorAnalyzer;

  beforeEach(() => {
    registry = new AnalyzerRegistry();
    mockAnalyzer = new MockAnalyzer();
    emptyAnalyzer = new EmptyAnalyzer();
    errorAnalyzer = new ErrorAnalyzer();
    vi.clearAllMocks();
  });

  describe('register and get', () => {
    it('should register and retrieve analyzers', () => {
      registry.register(mockAnalyzer);
      const retrieved = registry.get('mock');

      expect(retrieved).toBe(mockAnalyzer);
    });

    it('should return undefined for non-existent analyzer', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should allow registering as primary', () => {
      registry.register(mockAnalyzer, true);
      const primary = registry.getPrimary();

      expect(primary).toBe(mockAnalyzer);
    });

    it('should override analyzer with same name', () => {
      const analyzer1 = new MockAnalyzer();
      const analyzer2 = new MockAnalyzer();

      registry.register(analyzer1);
      registry.register(analyzer2);

      expect(registry.get('mock')).toBe(analyzer2);
    });
  });

  describe('setPrimary', () => {
    it('should set primary analyzer', () => {
      registry.register(mockAnalyzer);
      registry.register(emptyAnalyzer);

      registry.setPrimary('empty');
      const primary = registry.getPrimary();

      expect(primary).toBe(emptyAnalyzer);
    });

    it('should not set primary if analyzer does not exist', () => {
      registry.register(mockAnalyzer, true);
      registry.setPrimary('non-existent');

      const primary = registry.getPrimary();
      expect(primary).toBe(mockAnalyzer); // Unchanged
    });
  });

  describe('getPrimary', () => {
    it('should return primary analyzer', () => {
      registry.register(mockAnalyzer, true);
      const primary = registry.getPrimary();

      expect(primary).toBe(mockAnalyzer);
    });

    it('should return first analyzer if no primary set', () => {
      registry.register(mockAnalyzer);
      registry.register(emptyAnalyzer);

      const primary = registry.getPrimary();
      expect(primary).toBeDefined();
    });

    it('should return undefined if no analyzers registered', () => {
      const primary = registry.getPrimary();
      expect(primary).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered analyzers', () => {
      registry.register(mockAnalyzer);
      registry.register(emptyAnalyzer);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContain(mockAnalyzer);
      expect(all).toContain(emptyAnalyzer);
    });

    it('should return empty array when no analyzers', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('analyzeWithPrimary', () => {
    it('should analyze using primary analyzer', async () => {
      registry.register(mockAnalyzer, true);

      const vibes = await registry.analyzeWithPrimary(mockRawContentList);

      expect(vibes.length).toBeGreaterThan(0);
    });

    it('should throw error if no analyzer available', async () => {
      await expect(registry.analyzeWithPrimary(mockRawContentList)).rejects.toThrow(
        'No analyzer available'
      );
    });

    it('should use first analyzer if no primary set', async () => {
      registry.register(mockAnalyzer);

      const vibes = await registry.analyzeWithPrimary(mockRawContentList);

      expect(vibes.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeWithAll', () => {
    it('should analyze with all registered analyzers', async () => {
      registry.register(mockAnalyzer);
      registry.register(emptyAnalyzer);

      const results = await registry.analyzeWithAll(mockRawContentList);

      expect(results.size).toBe(2);
      expect(results.has('mock')).toBe(true);
      expect(results.has('empty')).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      registry.register(mockAnalyzer);
      registry.register(errorAnalyzer);

      const results = await registry.analyzeWithAll(mockRawContentList);

      expect(results.size).toBe(2);
      expect(results.get('mock')?.length).toBeGreaterThan(0);
      expect(results.get('error')).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return empty map if no analyzers registered', async () => {
      const results = await registry.analyzeWithAll(mockRawContentList);
      expect(results.size).toBe(0);
    });
  });

  describe('analyzeWithFallback', () => {
    it('should use primary analyzer', async () => {
      registry.register(mockAnalyzer);
      registry.register(emptyAnalyzer);

      const vibes = await registry.analyzeWithFallback(
        mockRawContentList,
        'mock',
        'empty'
      );

      expect(vibes.length).toBeGreaterThan(0);
    });

    it('should fallback on primary failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      registry.register(errorAnalyzer);
      registry.register(emptyAnalyzer);

      const vibes = await registry.analyzeWithFallback(
        mockRawContentList,
        'error',
        'empty'
      );

      expect(vibes).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Falling back to empty');

      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should throw if primary fails and no fallback provided', async () => {
      registry.register(errorAnalyzer);

      await expect(
        registry.analyzeWithFallback(mockRawContentList, 'error')
      ).rejects.toThrow('Analysis failed');
    });

    it('should throw if primary analyzer not found', async () => {
      await expect(
        registry.analyzeWithFallback(mockRawContentList, 'non-existent')
      ).rejects.toThrow('Analyzer non-existent not found');
    });

    it('should throw if fallback analyzer not found', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      registry.register(errorAnalyzer);

      await expect(
        registry.analyzeWithFallback(mockRawContentList, 'error', 'non-existent')
      ).rejects.toThrow('Analysis failed');

      consoleSpy.mockRestore();
    });
  });
});
