import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticMatcher } from '../semantic';
import { mockScenario } from '../../__fixtures__/scenarios';
import { mockVibes, createMockVibe } from '../../__fixtures__/vibes';
import { CulturalGraph } from '../../types';

// Mock embeddings
vi.mock('@/lib/embeddings', () => ({
  getEmbeddingProvider: vi.fn().mockResolvedValue({
    generateEmbedding: vi.fn(),
  }),
}));

describe('SemanticMatcher', () => {
  let matcher: SemanticMatcher;
  let mockEmbeddingProvider: any;
  let mockGraph: CulturalGraph;

  beforeEach(async () => {
    matcher = new SemanticMatcher();

    const { getEmbeddingProvider } = await import('@/lib/embeddings');
    mockEmbeddingProvider = await getEmbeddingProvider();

    // Create mock graph with vibes that have embeddings
    const vibesWithEmbeddings = mockVibes.map(v => ({
      ...v,
      embedding: Array(384).fill(0).map((_, i) => Math.sin(i * 0.1)),
    }));

    mockGraph = {
      vibes: new Map(vibesWithEmbeddings.map(v => [v.id, v])),
      edges: [],
      metadata: {
        lastUpdated: new Date(),
        vibeCount: vibesWithEmbeddings.length,
        version: '1.0',
      },
    };

    vi.clearAllMocks();
  });

  describe('match', () => {
    it('should match scenario to semantically similar vibes', async () => {
      // Mock scenario embedding similar to first vibe
      const scenarioEmbedding = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.05));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].vibe).toBeDefined();
      expect(matches[0].relevanceScore).toBeGreaterThan(0.5);
      expect(matches[0].reasoning).toContain('Semantic similarity');
    });

    it('should skip vibes without embeddings', async () => {
      const scenarioEmbedding = Array(384).fill(1);
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const vibeWithoutEmbedding = createMockVibe({
        id: 'no-embedding',
        embedding: undefined,
      });

      mockGraph.vibes.set('no-embedding', vibeWithoutEmbedding);

      const matches = await matcher.match(mockScenario, mockGraph);

      // Should not include vibe without embedding
      expect(matches.every(m => m.vibe.id !== 'no-embedding')).toBe(true);
    });

    it('should filter out low similarity matches', async () => {
      // Create very different embedding
      const scenarioEmbedding = Array(384).fill(0).map((_, i) => Math.cos(i * 0.5));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const matches = await matcher.match(mockScenario, mockGraph);

      // All matches should have similarity > 0.5
      expect(matches.every(m => m.relevanceScore > 0.5)).toBe(true);
    });

    it('should limit results to top N matches', async () => {
      // Create many similar vibes
      for (let i = 0; i < 30; i++) {
        const vibe = createMockVibe({
          id: `vibe-${i}`,
          embedding: Array(384).fill(0).map((_, j) => Math.sin(j * 0.1 + i * 0.01)),
        });
        mockGraph.vibes.set(vibe.id, vibe);
      }

      const scenarioEmbedding = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const matches = await matcher.match(mockScenario, mockGraph);

      // Should be limited to top 20
      expect(matches.length).toBeLessThanOrEqual(20);
    });

    it('should sort matches by relevance score descending', async () => {
      const scenarioEmbedding = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const matches = await matcher.match(mockScenario, mockGraph);

      if (matches.length > 1) {
        for (let i = 1; i < matches.length; i++) {
          expect(matches[i - 1].relevanceScore).toBeGreaterThanOrEqual(matches[i].relevanceScore);
        }
      }
    });

    it('should generate scenario text from all fields', async () => {
      const scenarioEmbedding = Array(384).fill(1);
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      await matcher.match(mockScenario, mockGraph);

      const callArg = mockEmbeddingProvider.generateEmbedding.mock.calls[0][0];
      expect(callArg).toContain(mockScenario.description);
      if (mockScenario.context?.location) {
        expect(callArg).toContain(mockScenario.context.location);
      }
    });

    it('should handle embedding errors gracefully', async () => {
      mockEmbeddingProvider.generateEmbedding.mockRejectedValueOnce(
        new Error('Embedding failed')
      );

      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches).toEqual([]);
    });

    it('should calculate cosine similarity correctly', async () => {
      // Create exactly matching embedding
      const embedding = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(embedding);

      const exactMatchVibe = createMockVibe({
        id: 'exact-match',
        embedding: embedding,
      });
      mockGraph.vibes.set('exact-match', exactMatchVibe);

      const matches = await matcher.match(mockScenario, mockGraph);

      const exactMatch = matches.find(m => m.vibe.id === 'exact-match');
      expect(exactMatch).toBeDefined();
      expect(exactMatch?.relevanceScore).toBeCloseTo(1.0, 2);
    });

    it('should include reasoning in matches', async () => {
      const scenarioEmbedding = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const matches = await matcher.match(mockScenario, mockGraph);

      if (matches.length > 0) {
        expect(matches[0].reasoning).toBeDefined();
        expect(matches[0].reasoning).toMatch(/\d+\.\d+%/); // Should include percentage
      }
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(matcher.name).toBe('semantic');
      expect(matcher.description).toBe('Matches scenarios to vibes using semantic similarity');
    });
  });
});
