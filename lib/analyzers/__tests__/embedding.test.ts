import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmbeddingAnalyzer } from '../embedding';
import { mockRawContentList } from '../../__fixtures__/raw-content';

// Mock the embeddings module
vi.mock('@/lib/embeddings', () => ({
  getEmbeddingProvider: vi.fn().mockResolvedValue({
    generateEmbeddings: vi.fn(),
  }),
}));

describe('EmbeddingAnalyzer', () => {
  let analyzer: EmbeddingAnalyzer;
  let mockEmbeddingProvider: any;

  beforeEach(async () => {
    analyzer = new EmbeddingAnalyzer();

    const { getEmbeddingProvider } = await import('@/lib/embeddings');
    mockEmbeddingProvider = await getEmbeddingProvider();
    vi.clearAllMocks();
  });

  describe('analyze', () => {
    it('should return empty array for empty content', async () => {
      const result = await analyzer.analyze([]);
      expect(result).toEqual([]);
    });

    it('should cluster similar content and generate vibes', async () => {
      // Create similar embeddings for content that should cluster
      const embedding1 = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1));
      const embedding2 = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.05)); // Similar
      const embedding3 = Array(384).fill(0).map((_, i) => Math.cos(i * 0.5)); // Different

      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([
        embedding1,
        embedding2,
        embedding3,
      ]);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('topic');
      expect(result[0].keywords.length).toBeGreaterThan(0);
    });

    it('should generate embeddings from content text', async () => {
      const mockEmbeddings = [
        Array(384).fill(1),
        Array(384).fill(1),
        Array(384).fill(1),
      ];

      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce(mockEmbeddings);

      await analyzer.analyze(mockRawContentList);

      expect(mockEmbeddingProvider.generateEmbeddings).toHaveBeenCalledTimes(1);
      const callArgs = mockEmbeddingProvider.generateEmbeddings.mock.calls[0];
      expect(callArgs[0]).toHaveLength(3);
      expect(callArgs[1]).toMatchObject({ batchSize: 10 });
    });

    it('should create vibes with embeddings', async () => {
      const embedding = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1));
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([embedding]);

      const result = await analyzer.analyze([mockRawContentList[0]]);

      expect(result[0].embedding).toBeDefined();
      expect(result[0].embedding?.length).toBe(384);
    });

    it('should extract keywords from clustered content', async () => {
      const embedding = Array(384).fill(1);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([embedding]);

      const contentWithKeywords = [{
        ...mockRawContentList[0],
        title: 'Artificial intelligence technology tools',
        body: 'Technology and artificial intelligence are transforming productivity tools',
      }];

      const result = await analyzer.analyze(contentWithKeywords);

      expect(result[0].keywords.length).toBeGreaterThan(0);
      // Should extract common words (4+ characters)
      expect(result[0].keywords.some(k => k.length >= 4)).toBe(true);
    });

    it('should calculate vibe strength based on cluster size', async () => {
      const embedding = Array(384).fill(1);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([
        embedding,
        embedding,
        embedding,
      ]);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result[0].strength).toBeGreaterThan(0);
      expect(result[0].strength).toBeLessThanOrEqual(1);
    });

    it('should handle embedding generation errors gracefully', async () => {
      mockEmbeddingProvider.generateEmbeddings.mockRejectedValueOnce(
        new Error('Embedding error')
      );

      const result = await analyzer.analyze(mockRawContentList);

      expect(result).toEqual([]);
    });

    it('should cluster by similarity threshold', async () => {
      // Two similar embeddings and one different
      const similar1 = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1));
      const similar2 = Array(384).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.1));
      const different = Array(384).fill(0).map((_, i) => Math.cos(i * 0.5));

      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([
        similar1,
        similar2,
        different,
      ]);

      const result = await analyzer.analyze(mockRawContentList);

      // Should create separate clusters
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include singleton clusters', async () => {
      // Each embedding is different
      const embeddings = [
        Array(384).fill(0).map((_, i) => Math.sin(i * 0.1)),
        Array(384).fill(0).map((_, i) => Math.cos(i * 0.2)),
        Array(384).fill(0).map((_, i) => Math.tan(i * 0.05)),
      ];

      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce(embeddings);

      const result = await analyzer.analyze(mockRawContentList);

      // Should create vibes even for singleton clusters
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include sources in vibes', async () => {
      const embedding = Array(384).fill(1);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([embedding]);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result[0].sources.length).toBeGreaterThan(0);
      expect(result[0].sources[0]).toBe(mockRawContentList[0].url);
    });

    it('should set sentiment to neutral by default', async () => {
      const embedding = Array(384).fill(1);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([embedding]);

      const result = await analyzer.analyze([mockRawContentList[0]]);

      expect(result[0].sentiment).toBe('neutral');
    });

    it('should generate descriptive vibe names from keywords', async () => {
      const embedding = Array(384).fill(1);
      mockEmbeddingProvider.generateEmbeddings.mockResolvedValueOnce([embedding]);

      const result = await analyzer.analyze([mockRawContentList[0]]);

      expect(result[0].name).toBeDefined();
      expect(result[0].name.length).toBeGreaterThan(0);
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(analyzer.name).toBe('embedding');
      expect(analyzer.description).toBe('Uses embeddings to cluster and identify vibes');
    });
  });
});
