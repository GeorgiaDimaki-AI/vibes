import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMAnalyzer } from '../llm';
import { mockRawContentList } from '../../__fixtures__/raw-content';

// Mock the LLM module
vi.mock('@/lib/llm', () => ({
  getLLM: vi.fn().mockResolvedValue({
    complete: vi.fn(),
  }),
}));

// Mock utils
vi.mock('@/lib/utils/network', () => ({
  sanitizeUserInput: vi.fn((input: string) => input),
}));

describe('LLMAnalyzer', () => {
  let analyzer: LLMAnalyzer;
  let mockLLM: any;

  beforeEach(async () => {
    analyzer = new LLMAnalyzer();

    const { getLLM } = await import('@/lib/llm');
    mockLLM = await getLLM();
    vi.clearAllMocks();
  });

  describe('analyze', () => {
    it('should return empty array for empty content', async () => {
      const result = await analyzer.analyze([]);
      expect(result).toEqual([]);
    });

    it('should extract vibes from LLM response', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'AI Productivity Tools',
            description: 'Tools using AI for productivity',
            category: 'trend',
            keywords: ['ai', 'productivity', 'automation'],
            strength: 0.8,
            sentiment: 'positive',
            demographics: ['tech workers'],
            domains: ['tech', 'business'],
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('AI Productivity Tools');
      expect(result[0].category).toBe('trend');
      expect(result[0].keywords).toContain('ai');
      expect(result[0].strength).toBe(0.8);
      expect(result[0].sentiment).toBe('positive');
    });

    it('should parse JSON from markdown code blocks', async () => {
      const mockResponse = {
        content: '```json\n[\n  {\n    "name": "Test Vibe",\n    "description": "Test",\n    "category": "trend",\n    "keywords": ["test"],\n    "strength": 0.5,\n    "sentiment": "neutral"\n  }\n]\n```',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Vibe');
    });

    it('should parse JSON without code blocks', async () => {
      const mockResponse = {
        content: '[{"name": "Direct JSON", "description": "Test", "category": "trend", "keywords": ["test"], "strength": 0.6, "sentiment": "positive"}]',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Direct JSON');
    });

    it('should handle LLM errors gracefully', async () => {
      mockLLM.complete.mockRejectedValueOnce(new Error('LLM error'));

      const result = await analyzer.analyze(mockRawContentList);

      expect(result).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      const mockResponse = {
        content: 'This is not valid JSON',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result).toEqual([]);
    });

    it('should handle non-array JSON gracefully', async () => {
      const mockResponse = {
        content: '{"not": "an array"}',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result).toEqual([]);
    });

    it('should batch content for large datasets', async () => {
      const largeContentList = Array(25).fill(mockRawContentList[0]);

      const mockResponse = {
        content: '[]',
      };

      mockLLM.complete.mockResolvedValue(mockResponse);

      await analyzer.analyze(largeContentList);

      // Should be called 3 times (10 items per batch)
      expect(mockLLM.complete).toHaveBeenCalledTimes(3);
    });

    it('should deduplicate vibes with same name', async () => {
      const mockResponse1 = {
        content: JSON.stringify([
          {
            name: 'AI Tools',
            description: 'AI tools',
            category: 'trend',
            keywords: ['ai', 'tools'],
            strength: 0.7,
            sentiment: 'positive',
          },
        ]),
      };

      const mockResponse2 = {
        content: JSON.stringify([
          {
            name: 'AI Tools',
            description: 'More AI tools',
            category: 'trend',
            keywords: ['ai', 'automation'],
            strength: 0.9,
            sentiment: 'positive',
          },
        ]),
      };

      mockLLM.complete
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const largeContentList = Array(15).fill(mockRawContentList[0]);
      const result = await analyzer.analyze(largeContentList);

      // Should be deduplicated to 1 vibe
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('AI Tools');
      expect(result[0].strength).toBe(0.9); // Takes max strength
      expect(result[0].keywords).toContain('ai');
      expect(result[0].keywords).toContain('tools');
      expect(result[0].keywords).toContain('automation');
    });

    it('should set geographic metadata from content', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Tech Trend',
            description: 'Tech trend',
            category: 'trend',
            keywords: ['tech'],
            strength: 0.8,
            sentiment: 'positive',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result[0].geography).toBeDefined();
      expect(result[0].geography?.primary).toBeDefined();
      expect(result[0].geography?.relevance).toBeDefined();
    });

    it('should set half-life based on vibe properties', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Test Vibe',
            description: 'Test',
            category: 'meme',
            keywords: ['test'],
            strength: 0.8,
            sentiment: 'positive',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result[0].halfLife).toBeDefined();
      expect(result[0].halfLife).toBeGreaterThan(0);
    });

    it('should include sources from content', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Test Vibe',
            description: 'Test',
            category: 'trend',
            keywords: ['test'],
            strength: 0.8,
            sentiment: 'positive',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const result = await analyzer.analyze(mockRawContentList);

      expect(result[0].sources.length).toBeGreaterThan(0);
      expect(result[0].sources).toContain(mockRawContentList[0].url);
    });

    it('should set firstSeen and lastSeen to current time', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            name: 'Test Vibe',
            description: 'Test',
            category: 'trend',
            keywords: ['test'],
            strength: 0.8,
            sentiment: 'positive',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const before = new Date();
      const result = await analyzer.analyze(mockRawContentList);
      const after = new Date();

      expect(result[0].firstSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result[0].firstSeen.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result[0].lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result[0].lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(analyzer.name).toBe('llm');
      expect(analyzer.description).toBe('Uses local LLM to extract cultural vibes from content');
    });
  });
});
