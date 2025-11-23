import { describe, it, expect } from 'vitest';
import { MemoryGraphStore } from '../memory';
import { createMockVibe } from '../../__fixtures__/vibes';

describe('Embedding Dimension Validation', () => {
  describe('Valid dimensions', () => {
    it('should accept 768-dim embeddings (Ollama)', async () => {
      const store = new MemoryGraphStore();
      const vibe = createMockVibe({
        id: 'ollama-vibe',
        embedding: Array(768).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      await expect(store.saveVibe(vibe)).resolves.toBeUndefined();

      const retrieved = await store.getVibe('ollama-vibe');
      expect(retrieved?.embedding).toHaveLength(768);
    });

    it('should accept 1536-dim embeddings (OpenAI)', async () => {
      const store = new MemoryGraphStore();
      const vibe = createMockVibe({
        id: 'openai-vibe',
        embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
      });

      await expect(store.saveVibe(vibe)).resolves.toBeUndefined();

      const retrieved = await store.getVibe('openai-vibe');
      expect(retrieved?.embedding).toHaveLength(1536);
    });

    it('should accept vibes without embeddings', async () => {
      const store = new MemoryGraphStore();
      const vibe = createMockVibe({
        id: 'no-embedding',
        embedding: undefined,
      });

      await expect(store.saveVibe(vibe)).resolves.toBeUndefined();
    });
  });

  describe('Invalid dimensions', () => {
    it('should reject 384-dim embeddings', async () => {
      const store = new MemoryGraphStore();
      const vibe = createMockVibe({
        id: 'invalid-vibe',
        embedding: Array(384).fill(1),
      });

      await expect(store.saveVibe(vibe)).rejects.toThrow(
        'Invalid embedding dimension: 384'
      );
    });

    it('should reject 512-dim embeddings', async () => {
      const store = new MemoryGraphStore();
      const vibe = createMockVibe({
        id: 'invalid-vibe',
        embedding: Array(512).fill(1),
      });

      await expect(store.saveVibe(vibe)).rejects.toThrow(
        'Invalid embedding dimension: 512'
      );
    });

    it('should reject embeddings with NaN values', async () => {
      const store = new MemoryGraphStore();
      const vibe = createMockVibe({
        id: 'nan-vibe',
        embedding: [1, 2, NaN, 4, ...Array(764).fill(0)],
      });

      await expect(store.saveVibe(vibe)).rejects.toThrow(
        'Embedding contains invalid values'
      );
    });

    it('should reject embeddings with Infinity values', async () => {
      const store = new MemoryGraphStore();
      const vibe = createMockVibe({
        id: 'infinity-vibe',
        embedding: [1, 2, Infinity, 4, ...Array(764).fill(0)],
      });

      await expect(store.saveVibe(vibe)).rejects.toThrow(
        'Embedding contains invalid values'
      );
    });
  });

  describe('Mixed dimension queries', () => {
    it('should only match embeddings with same dimensions', async () => {
      const store = new MemoryGraphStore();

      // Add 768-dim vibes
      await store.saveVibe(
        createMockVibe({
          id: 'ollama-1',
          embedding: Array(768).fill(0).map((_, i) => Math.sin(i * 0.1)),
        })
      );

      // Add 1536-dim vibes
      await store.saveVibe(
        createMockVibe({
          id: 'openai-1',
          embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
        })
      );

      // Query with 768-dim embedding should only return 768-dim vibes
      const query768 = Array(768).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.01));
      const results768 = await store.findVibesByEmbedding(query768);
      expect(results768).toHaveLength(1);
      expect(results768[0].id).toBe('ollama-1');

      // Query with 1536-dim embedding should only return 1536-dim vibes
      const query1536 = Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.01));
      const results1536 = await store.findVibesByEmbedding(query1536);
      expect(results1536).toHaveLength(1);
      expect(results1536[0].id).toBe('openai-1');
    });
  });
});
