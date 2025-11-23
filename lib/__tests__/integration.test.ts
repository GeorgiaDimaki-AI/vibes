import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryGraphStore } from '../graph/memory';
import { NewsCollector } from '../collectors/news';
import { LLMAnalyzer } from '../analyzers/llm';
import { SemanticMatcher } from '../matchers/semantic';
import { mockRawContentList } from '../__fixtures__/raw-content';
import { mockScenario } from '../__fixtures__/scenarios';

// Mock external dependencies
vi.mock('@/lib/llm', () => ({
  getLLM: vi.fn().mockResolvedValue({
    complete: vi.fn(),
  }),
}));

vi.mock('@/lib/embeddings', () => ({
  getEmbeddingProvider: vi.fn().mockResolvedValue({
    generateEmbedding: vi.fn(),
    generateEmbeddings: vi.fn(),
  }),
}));

vi.mock('@/lib/utils/network', () => ({
  sanitizeUserInput: vi.fn((input: string) => input),
}));

describe('Integration Tests', () => {
  describe('Collection → Analysis → Storage Flow', () => {
    let store: MemoryGraphStore;
    let collector: NewsCollector;
    let analyzer: LLMAnalyzer;
    let mockLLM: any;

    beforeEach(async () => {
      store = new MemoryGraphStore();
      collector = new NewsCollector();
      analyzer = new LLMAnalyzer();

      const { getLLM } = await import('@/lib/llm');
      mockLLM = await getLLM();

      vi.clearAllMocks();
      await store.clearGraph();
    });

    it('should collect, analyze, and store vibes end-to-end', async () => {
      // Step 1: Collect data
      const mockNewsResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: 'techcrunch', name: 'TechCrunch' },
            author: 'Test Author',
            title: 'AI Breakthrough',
            description: 'Major AI advancement',
            url: 'https://techcrunch.com/article',
            urlToImage: null,
            publishedAt: '2025-11-23T10:00:00Z',
            content: 'Content here',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewsResponse,
      } as any);

      process.env.NEWS_API_KEY = 'test-key';
      const rawContent = await collector.collect({ limit: 1 });

      expect(rawContent).toHaveLength(1);
      expect(rawContent[0].source).toBe('news');

      // Step 2: Analyze content
      const mockLLMResponse = {
        content: JSON.stringify([
          {
            name: 'AI Innovation',
            description: 'AI technology advances',
            category: 'trend',
            keywords: ['ai', 'technology'],
            strength: 0.8,
            sentiment: 'positive',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockLLMResponse);

      const vibes = await analyzer.analyze(rawContent);

      expect(vibes).toHaveLength(1);
      expect(vibes[0].name).toBe('AI Innovation');
      expect(vibes[0].category).toBe('trend');

      // Step 3: Store vibes
      await store.saveVibes(vibes);

      const storedVibes = await store.getAllVibes();
      expect(storedVibes).toHaveLength(1);
      expect(storedVibes[0].id).toBe(vibes[0].id);
    });

    it('should handle temporal decay in stored vibes', async () => {
      const mockLLMResponse = {
        content: JSON.stringify([
          {
            name: 'Trending Topic',
            description: 'Hot topic',
            category: 'trend',
            keywords: ['trending'],
            strength: 0.9,
            sentiment: 'positive',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockLLMResponse);

      const vibes = await analyzer.analyze(mockRawContentList);
      await store.saveVibes(vibes);

      // Update vibe with old lastSeen
      const oldVibe = {
        ...vibes[0],
        lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
      };
      await store.saveVibe(oldVibe);

      // Retrieve and verify temporal decay data is preserved
      const retrieved = await store.getVibe(oldVibe.id);
      expect(retrieved?.lastSeen.getTime()).toBe(oldVibe.lastSeen.getTime());
    });
  });

  describe('Scenario → Matching → Advice Flow', () => {
    let store: MemoryGraphStore;
    let matcher: SemanticMatcher;
    let mockEmbeddingProvider: any;

    beforeEach(async () => {
      store = new MemoryGraphStore();
      matcher = new SemanticMatcher();

      const { getEmbeddingProvider } = await import('@/lib/embeddings');
      mockEmbeddingProvider = await getEmbeddingProvider();

      vi.clearAllMocks();
      await store.clearGraph();

      // Add vibes with embeddings to store
      const vibesWithEmbeddings = [
        {
          id: 'vibe-1',
          name: 'Tech Trends',
          description: 'Latest technology trends',
          category: 'trend' as const,
          keywords: ['tech', 'innovation'],
          embedding: Array(384).fill(0).map((_, i) => Math.sin(i * 0.1)),
          strength: 0.8,
          sentiment: 'positive' as const,
          timestamp: new Date(),
          sources: ['source1'],
          firstSeen: new Date(),
          lastSeen: new Date(),
          currentRelevance: 0.8,
          halfLife: 14,
        },
      ];

      await store.saveVibes(vibesWithEmbeddings);
    });

    it('should match scenario to relevant vibes', async () => {
      // Mock scenario embedding similar to stored vibe
      const scenarioEmbedding = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.05));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const graph = await store.getGraph();
      const matches = await matcher.match(mockScenario, graph);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].vibe.id).toBe('vibe-1');
      expect(matches[0].relevanceScore).toBeGreaterThan(0.5);
    });

    it('should filter matches by relevance threshold', async () => {
      // Mock very different embedding
      const scenarioEmbedding = Array(384).fill(0).map((_, i) => Math.cos(i * 0.5));
      mockEmbeddingProvider.generateEmbedding.mockResolvedValueOnce(scenarioEmbedding);

      const graph = await store.getGraph();
      const matches = await matcher.match(mockScenario, graph);

      // Low similarity should result in no matches (threshold is 0.5)
      expect(matches.every(m => m.relevanceScore > 0.5)).toBe(true);
    });
  });

  describe('Graph Operations', () => {
    let store: MemoryGraphStore;

    beforeEach(async () => {
      store = new MemoryGraphStore();
      await store.clearGraph();
    });

    it('should build graph with vibes and edges', async () => {
      const vibes = [
        {
          id: 'vibe-1',
          name: 'Vibe 1',
          description: 'First vibe',
          category: 'trend' as const,
          keywords: ['test'],
          strength: 0.8,
          sentiment: 'positive' as const,
          timestamp: new Date(),
          sources: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
          currentRelevance: 0.8,
          halfLife: 14,
        },
        {
          id: 'vibe-2',
          name: 'Vibe 2',
          description: 'Second vibe',
          category: 'topic' as const,
          keywords: ['test'],
          strength: 0.7,
          sentiment: 'neutral' as const,
          timestamp: new Date(),
          sources: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
          currentRelevance: 0.7,
          halfLife: 21,
        },
      ];

      await store.saveVibes(vibes);

      const edge = {
        from: 'vibe-1',
        to: 'vibe-2',
        type: 'related' as const,
        strength: 0.8,
      };

      await store.saveEdge(edge);

      const graph = await store.getGraph();

      expect(graph.vibes.size).toBe(2);
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].from).toBe('vibe-1');
      expect(graph.edges[0].to).toBe('vibe-2');
    });

    it('should maintain referential integrity when deleting vibes', async () => {
      const vibes = [
        {
          id: 'vibe-1',
          name: 'Vibe 1',
          description: 'First vibe',
          category: 'trend' as const,
          keywords: ['test'],
          strength: 0.8,
          sentiment: 'positive' as const,
          timestamp: new Date(),
          sources: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
          currentRelevance: 0.8,
          halfLife: 14,
        },
        {
          id: 'vibe-2',
          name: 'Vibe 2',
          description: 'Second vibe',
          category: 'topic' as const,
          keywords: ['test'],
          strength: 0.7,
          sentiment: 'neutral' as const,
          timestamp: new Date(),
          sources: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
          currentRelevance: 0.7,
          halfLife: 21,
        },
      ];

      await store.saveVibes(vibes);

      const edge = {
        from: 'vibe-1',
        to: 'vibe-2',
        type: 'related' as const,
        strength: 0.8,
      };

      await store.saveEdge(edge);

      // Delete vibe-1
      await store.deleteVibe('vibe-1');

      const remainingVibes = await store.getAllVibes();
      const remainingEdges = await store.getEdges();

      expect(remainingVibes).toHaveLength(1);
      expect(remainingVibes[0].id).toBe('vibe-2');
      expect(remainingEdges).toHaveLength(0); // Edge should be deleted
    });
  });
});
