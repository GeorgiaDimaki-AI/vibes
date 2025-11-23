import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryGraphStore } from '../memory';
import { createMockVibe } from '../../__fixtures__/vibes';
import { GraphEdge } from '../../types';

describe('MemoryGraphStore', () => {
  let store: MemoryGraphStore;

  beforeEach(() => {
    store = new MemoryGraphStore();
  });

  describe('saveVibe and getVibe', () => {
    it('should save and retrieve a vibe', async () => {
      const vibe = createMockVibe({ id: 'test-1' });

      await store.saveVibe(vibe);
      const retrieved = await store.getVibe('test-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-1');
      expect(retrieved?.name).toBe(vibe.name);
    });

    it('should return null for non-existent vibe', async () => {
      const retrieved = await store.getVibe('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should deep copy vibes to prevent mutations', async () => {
      const vibe = createMockVibe({ id: 'test-1', strength: 0.5 });

      await store.saveVibe(vibe);
      vibe.strength = 0.9; // Mutate original

      const retrieved = await store.getVibe('test-1');
      expect(retrieved?.strength).toBe(0.5); // Should not be mutated
    });

    it('should update existing vibe', async () => {
      const vibe1 = createMockVibe({ id: 'test-1', strength: 0.5 });
      const vibe2 = createMockVibe({ id: 'test-1', strength: 0.9 });

      await store.saveVibe(vibe1);
      await store.saveVibe(vibe2);

      const retrieved = await store.getVibe('test-1');
      expect(retrieved?.strength).toBe(0.9);
    });
  });

  describe('saveVibes', () => {
    it('should save multiple vibes', async () => {
      const vibes = [
        createMockVibe({ id: 'test-1' }),
        createMockVibe({ id: 'test-2' }),
        createMockVibe({ id: 'test-3' }),
      ];

      await store.saveVibes(vibes);

      const vibe1 = await store.getVibe('test-1');
      const vibe2 = await store.getVibe('test-2');
      const vibe3 = await store.getVibe('test-3');

      expect(vibe1).toBeDefined();
      expect(vibe2).toBeDefined();
      expect(vibe3).toBeDefined();
    });
  });

  describe('getAllVibes', () => {
    it('should return all vibes', async () => {
      const vibes = [
        createMockVibe({ id: 'test-1' }),
        createMockVibe({ id: 'test-2' }),
      ];

      await store.saveVibes(vibes);
      const allVibes = await store.getAllVibes();

      expect(allVibes).toHaveLength(2);
      expect(allVibes.map(v => v.id)).toContain('test-1');
      expect(allVibes.map(v => v.id)).toContain('test-2');
    });

    it('should return empty array when no vibes', async () => {
      const allVibes = await store.getAllVibes();
      expect(allVibes).toEqual([]);
    });
  });

  describe('deleteVibe', () => {
    it('should delete a vibe', async () => {
      const vibe = createMockVibe({ id: 'test-1' });

      await store.saveVibe(vibe);
      await store.deleteVibe('test-1');

      const retrieved = await store.getVibe('test-1');
      expect(retrieved).toBeNull();
    });

    it('should delete associated edges when deleting vibe', async () => {
      const vibe1 = createMockVibe({ id: 'vibe-1' });
      const vibe2 = createMockVibe({ id: 'vibe-2' });

      await store.saveVibes([vibe1, vibe2]);

      const edge: GraphEdge = {
        from: 'vibe-1',
        to: 'vibe-2',
        type: 'related',
        strength: 0.8,
      };

      await store.saveEdge(edge);
      await store.deleteVibe('vibe-1');

      const edges = await store.getEdges();
      expect(edges).toHaveLength(0);
    });
  });

  describe('saveEdge and getEdges', () => {
    it('should save and retrieve edges', async () => {
      const edge: GraphEdge = {
        from: 'vibe-1',
        to: 'vibe-2',
        type: 'related',
        strength: 0.8,
      };

      await store.saveEdge(edge);
      const edges = await store.getEdges();

      expect(edges).toHaveLength(1);
      expect(edges[0].from).toBe('vibe-1');
      expect(edges[0].to).toBe('vibe-2');
      expect(edges[0].type).toBe('related');
    });

    it('should retrieve edges for specific vibe', async () => {
      const edges: GraphEdge[] = [
        { from: 'vibe-1', to: 'vibe-2', type: 'related', strength: 0.8 },
        { from: 'vibe-1', to: 'vibe-3', type: 'related', strength: 0.6 },
        { from: 'vibe-4', to: 'vibe-5', type: 'related', strength: 0.7 },
      ];

      for (const edge of edges) {
        await store.saveEdge(edge);
      }

      const vibe1Edges = await store.getEdges('vibe-1');

      expect(vibe1Edges).toHaveLength(2);
      expect(vibe1Edges.every(e => e.from === 'vibe-1' || e.to === 'vibe-1')).toBe(true);
    });

    it('should return all edges when no vibeId specified', async () => {
      const edges: GraphEdge[] = [
        { from: 'vibe-1', to: 'vibe-2', type: 'related', strength: 0.8 },
        { from: 'vibe-3', to: 'vibe-4', type: 'related', strength: 0.6 },
      ];

      for (const edge of edges) {
        await store.saveEdge(edge);
      }

      const allEdges = await store.getEdges();
      expect(allEdges).toHaveLength(2);
    });
  });

  describe('getGraph', () => {
    it('should return complete graph with vibes and edges', async () => {
      const vibes = [
        createMockVibe({ id: 'vibe-1' }),
        createMockVibe({ id: 'vibe-2' }),
      ];

      const edge: GraphEdge = {
        from: 'vibe-1',
        to: 'vibe-2',
        type: 'related',
        strength: 0.8,
      };

      await store.saveVibes(vibes);
      await store.saveEdge(edge);

      const graph = await store.getGraph();

      expect(graph.vibes.size).toBe(2);
      expect(graph.edges).toHaveLength(1);
      expect(graph.metadata.vibeCount).toBe(2);
      expect(graph.metadata.version).toBe('1.0');
    });
  });

  describe('clearGraph', () => {
    it('should clear all vibes and edges', async () => {
      const vibes = [
        createMockVibe({ id: 'vibe-1' }),
        createMockVibe({ id: 'vibe-2' }),
      ];

      const edge: GraphEdge = {
        from: 'vibe-1',
        to: 'vibe-2',
        type: 'related',
        strength: 0.8,
      };

      await store.saveVibes(vibes);
      await store.saveEdge(edge);

      await store.clearGraph();

      const allVibes = await store.getAllVibes();
      const allEdges = await store.getEdges();

      expect(allVibes).toHaveLength(0);
      expect(allEdges).toHaveLength(0);
    });
  });

  describe('findVibesByKeywords', () => {
    it('should find vibes by keywords', async () => {
      const vibes = [
        createMockVibe({ id: 'vibe-1', keywords: ['ai', 'tech', 'productivity'] }),
        createMockVibe({ id: 'vibe-2', keywords: ['fashion', 'style'] }),
        createMockVibe({ id: 'vibe-3', keywords: ['ai', 'automation'] }),
      ];

      await store.saveVibes(vibes);

      const results = await store.findVibesByKeywords(['ai']);

      expect(results).toHaveLength(2);
      expect(results.map(v => v.id)).toContain('vibe-1');
      expect(results.map(v => v.id)).toContain('vibe-3');
    });

    it('should be case-insensitive', async () => {
      const vibe = createMockVibe({ id: 'vibe-1', keywords: ['AI', 'Tech'] });

      await store.saveVibe(vibe);

      const results = await store.findVibesByKeywords(['ai']);
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const vibe = createMockVibe({ id: 'vibe-1', keywords: ['tech'] });

      await store.saveVibe(vibe);

      const results = await store.findVibesByKeywords(['fashion']);
      expect(results).toHaveLength(0);
    });
  });

  describe('findVibesByEmbedding', () => {
    it('should find vibes by embedding similarity', async () => {
      const embedding1 = Array(768).fill(0).map((_, i) => Math.sin(i * 0.1));
      const embedding2 = Array(768).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.05)); // Similar
      const embedding3 = Array(768).fill(0).map((_, i) => Math.cos(i * 0.5)); // Different

      const vibes = [
        createMockVibe({ id: 'vibe-1', embedding: embedding1 }),
        createMockVibe({ id: 'vibe-2', embedding: embedding2 }),
        createMockVibe({ id: 'vibe-3', embedding: embedding3 }),
      ];

      await store.saveVibes(vibes);

      const queryEmbedding = Array(768).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.02));
      const results = await store.findVibesByEmbedding(queryEmbedding, 2);

      expect(results).toHaveLength(2);
      // First result should be most similar
      expect(['vibe-1', 'vibe-2']).toContain(results[0].id);
    });

    it('should skip vibes without embeddings', async () => {
      const vibes = [
        createMockVibe({ id: 'vibe-1', embedding: Array(768).fill(1) }),
        createMockVibe({ id: 'vibe-2', embedding: undefined }),
      ];

      await store.saveVibes(vibes);

      const results = await store.findVibesByEmbedding(Array(768).fill(1));
      expect(results.every(v => v.embedding !== undefined)).toBe(true);
    });

    it('should limit results to topK', async () => {
      const vibes = Array(20).fill(0).map((_, i) =>
        createMockVibe({
          id: `vibe-${i}`,
          embedding: Array(768).fill(i / 20),
        })
      );

      await store.saveVibes(vibes);

      const results = await store.findVibesByEmbedding(Array(768).fill(0.5), 5);
      expect(results).toHaveLength(5);
    });
  });

  describe('findRecentVibes', () => {
    it('should find most recent vibes', async () => {
      const vibes = [
        createMockVibe({
          id: 'vibe-1',
          timestamp: new Date('2025-11-20T10:00:00Z'),
        }),
        createMockVibe({
          id: 'vibe-2',
          timestamp: new Date('2025-11-23T10:00:00Z'), // Most recent
        }),
        createMockVibe({
          id: 'vibe-3',
          timestamp: new Date('2025-11-22T10:00:00Z'),
        }),
      ];

      await store.saveVibes(vibes);

      const results = await store.findRecentVibes(2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('vibe-2'); // Most recent first
      expect(results[1].id).toBe('vibe-3');
    });

    it('should respect limit parameter', async () => {
      const vibes = Array(10).fill(0).map((_, i) =>
        createMockVibe({ id: `vibe-${i}` })
      );

      await store.saveVibes(vibes);

      const results = await store.findRecentVibes(5);
      expect(results).toHaveLength(5);
    });
  });

  describe('size limits', () => {
    it('should enforce max vibes limit', async () => {
      // This test would take too long with actual limit of 100k, so we just test the logic
      const store = new MemoryGraphStore();

      // Add one vibe
      await store.saveVibe(createMockVibe({ id: 'vibe-1' }));

      // The limit is 100,000 so we can't practically test it, but we can verify
      // the error would be thrown if we tried to exceed it
      expect(async () => {
        // Mock the internal size
        (store as any).vibes = new Map(
          Array(100000).fill(0).map((_, i) => [`vibe-${i}`, createMockVibe({ id: `vibe-${i}` })])
        );
        await store.saveVibe(createMockVibe({ id: 'new-vibe' }));
      }).rejects.toThrow('Memory store full');
    });
  });
});
