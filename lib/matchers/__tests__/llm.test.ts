import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMMatcher } from '../llm';
import { mockScenario } from '../../__fixtures__/scenarios';
import { mockVibes } from '../../__fixtures__/vibes';
import { CulturalGraph } from '../../types';

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

describe('LLMMatcher', () => {
  let matcher: LLMMatcher;
  let mockLLM: any;
  let mockGraph: CulturalGraph;

  beforeEach(async () => {
    matcher = new LLMMatcher();

    const { getLLM } = await import('@/lib/llm');
    mockLLM = await getLLM();

    mockGraph = {
      vibes: new Map(mockVibes.map(v => [v.id, v])),
      edges: [],
      metadata: {
        lastUpdated: new Date(),
        vibeCount: mockVibes.length,
        version: '1.0',
      },
    };

    vi.clearAllMocks();
  });

  describe('match', () => {
    it('should match scenario to relevant vibes using LLM', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            vibeId: 'vibe-meme-1',
            relevanceScore: 0.9,
            reasoning: 'Highly relevant for casual tech gathering',
          },
          {
            vibeId: 'vibe-trend-1',
            relevanceScore: 0.7,
            reasoning: 'Fits the trendy restaurant context',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches).toHaveLength(2);
      expect(matches[0].vibe.id).toBe('vibe-meme-1');
      expect(matches[0].relevanceScore).toBe(0.9);
      expect(matches[0].reasoning).toContain('Highly relevant');
    });

    it('should parse JSON from markdown code blocks', async () => {
      const mockResponse = {
        content: '```json\n[\n  {\n    "vibeId": "vibe-trend-1",\n    "relevanceScore": 0.8,\n    "reasoning": "Test"\n  }\n]\n```',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches).toHaveLength(1);
      expect(matches[0].vibe.id).toBe('vibe-trend-1');
    });

    it('should filter out invalid vibe IDs', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            vibeId: 'vibe-trend-1',
            relevanceScore: 0.8,
            reasoning: 'Valid vibe',
          },
          {
            vibeId: 'non-existent-vibe',
            relevanceScore: 0.7,
            reasoning: 'This vibe does not exist',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const matches = await matcher.match(mockScenario, mockGraph);

      // Should only include valid vibe
      expect(matches).toHaveLength(1);
      expect(matches[0].vibe.id).toBe('vibe-trend-1');
    });

    it('should apply temporal decay before matching', async () => {
      const mockResponse = {
        content: JSON.stringify([
          {
            vibeId: 'vibe-meme-1',
            relevanceScore: 0.9,
            reasoning: 'Relevant',
          },
        ]),
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      await matcher.match(mockScenario, mockGraph);

      // Check that LLM received vibes with currentRelevance
      const callArg = mockLLM.complete.mock.calls[0][0][0].content;
      expect(callArg).toContain('currentRelevance');
    });

    it('should limit vibes to top 50 by relevance', async () => {
      // Add many vibes with low relevance
      for (let i = 0; i < 100; i++) {
        mockGraph.vibes.set(`vibe-${i}`, {
          ...mockVibes[0],
          id: `vibe-${i}`,
          lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 100), // Very old
          currentRelevance: 0.01,
        });
      }

      const mockResponse = {
        content: '[]',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      await matcher.match(mockScenario, mockGraph);

      const callArg = mockLLM.complete.mock.calls[0][0][0].content;
      const vibesInPrompt = (callArg.match(/"id":/g) || []).length;
      expect(vibesInPrompt).toBeLessThanOrEqual(50);
    });

    it('should filter out vibes with very low relevance', async () => {
      mockGraph.vibes.set('low-relevance', {
        ...mockVibes[0],
        id: 'low-relevance',
        currentRelevance: 0.05, // Below threshold
      });

      const mockResponse = {
        content: '[]',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      await matcher.match(mockScenario, mockGraph);

      const callArg = mockLLM.complete.mock.calls[0][0][0].content;
      expect(callArg).not.toContain('low-relevance');
    });

    it('should handle LLM errors gracefully', async () => {
      mockLLM.complete.mockRejectedValueOnce(new Error('LLM error'));

      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches).toEqual([]);
    });

    it('should handle invalid JSON gracefully', async () => {
      const mockResponse = {
        content: 'This is not valid JSON',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches).toEqual([]);
    });

    it('should handle non-array JSON gracefully', async () => {
      const mockResponse = {
        content: '{"not": "an array"}',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      const matches = await matcher.match(mockScenario, mockGraph);

      expect(matches).toEqual([]);
    });

    it('should include scenario context in prompt', async () => {
      const mockResponse = {
        content: '[]',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      await matcher.match(mockScenario, mockGraph);

      const callArg = mockLLM.complete.mock.calls[0][0][0].content;
      expect(callArg).toContain(mockScenario.description);
      if (mockScenario.context) {
        expect(callArg).toContain('context');
      }
    });

    it('should include scenario preferences in prompt', async () => {
      const mockResponse = {
        content: '[]',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      await matcher.match(mockScenario, mockGraph);

      const callArg = mockLLM.complete.mock.calls[0][0][0].content;
      if (mockScenario.preferences) {
        expect(callArg).toContain('preferences');
      }
    });

    it('should include vibe metadata in prompt', async () => {
      const mockResponse = {
        content: '[]',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      await matcher.match(mockScenario, mockGraph);

      const callArg = mockLLM.complete.mock.calls[0][0][0].content;
      const firstVibe = Array.from(mockGraph.vibes.values())[0];
      expect(callArg).toContain(firstVibe.name);
      expect(callArg).toContain(firstVibe.description);
    });

    it('should pass correct parameters to LLM', async () => {
      const mockResponse = {
        content: '[]',
      };

      mockLLM.complete.mockResolvedValueOnce(mockResponse);

      await matcher.match(mockScenario, mockGraph);

      const callArgs = mockLLM.complete.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        maxTokens: 2000,
        temperature: 0.7,
      });
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(matcher.name).toBe('llm');
      expect(matcher.description).toBe('Uses local LLM to reason about scenario-vibe relevance');
    });
  });
});
