import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PostgresGraphStore } from '../postgres';
import { createMockVibe } from '../../__fixtures__/vibes';

// Mock @vercel/postgres
vi.mock('@vercel/postgres', () => {
  const mockSql = vi.fn();
  mockSql.begin = vi.fn();
  mockSql.query = vi.fn();
  return { sql: mockSql };
});

describe('PostgresGraphStore', () => {
  let store: PostgresGraphStore;
  let mockSql: any;

  beforeEach(async () => {
    store = new PostgresGraphStore();
    const { sql } = await import('@vercel/postgres');
    mockSql = sql;
    vi.clearAllMocks();

    // Set up default mock responses
    mockSql.mockResolvedValue({ rows: [] });
  });

  describe('initialize', () => {
    it('should create tables and indexes', async () => {
      await store.initialize();

      // Should create extension
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('CREATE EXTENSION')])
      );

      // Should create vibes table
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('CREATE TABLE IF NOT EXISTS vibes')])
      );

      // Should create edges table
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('CREATE TABLE IF NOT EXISTS edges')])
      );

      // Should create indexes
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('CREATE INDEX')])
      );
    });
  });

  describe('saveVibe', () => {
    it('should insert vibe into database', async () => {
      const vibe = createMockVibe({ id: 'test-1' });

      await store.saveVibe(vibe);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('INSERT INTO vibes')])
      );
    });

    it('should update existing vibe on conflict', async () => {
      const vibe = createMockVibe({ id: 'test-1' });

      await store.saveVibe(vibe);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('ON CONFLICT')])
      );
    });
  });

  describe('saveVibes', () => {
    it('should batch insert multiple vibes', async () => {
      const vibes = [
        createMockVibe({ id: 'vibe-1' }),
        createMockVibe({ id: 'vibe-2' }),
      ];

      await store.saveVibes(vibes);

      expect(mockSql.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vibes'),
        expect.any(Array)
      );
    });

    it('should handle empty array', async () => {
      await store.saveVibes([]);

      expect(mockSql.query).not.toHaveBeenCalled();
    });
  });

  describe('getVibe', () => {
    it('should retrieve vibe by id', async () => {
      const mockVibe = createMockVibe({ id: 'test-1' });
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: mockVibe.id,
            name: mockVibe.name,
            description: mockVibe.description,
            category: mockVibe.category,
            keywords: mockVibe.keywords,
            embedding: mockVibe.embedding,
            strength: mockVibe.strength,
            sentiment: mockVibe.sentiment,
            timestamp: mockVibe.timestamp.toISOString(),
            sources: mockVibe.sources,
            related_vibes: [],
            influences: [],
            demographics: [],
            locations: [],
            domains: [],
            metadata: {},
            first_seen: mockVibe.firstSeen.toISOString(),
            last_seen: mockVibe.lastSeen.toISOString(),
            current_relevance: mockVibe.currentRelevance,
          },
        ],
      });

      const result = await store.getVibe('test-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-1');
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SELECT * FROM vibes WHERE id')])
      );
    });

    it('should return null for non-existent vibe', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      const result = await store.getVibe('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllVibes', () => {
    it('should retrieve all vibes', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'vibe-1',
            name: 'Test Vibe',
            description: 'Test',
            category: 'trend',
            keywords: ['test'],
            strength: 0.8,
            sentiment: 'positive',
            timestamp: new Date().toISOString(),
            sources: [],
            related_vibes: [],
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            current_relevance: 0.8,
          },
        ],
      });

      const result = await store.getAllVibes();

      expect(result).toHaveLength(1);
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SELECT * FROM vibes ORDER BY timestamp')])
      );
    });
  });

  describe('deleteVibe', () => {
    it('should delete vibe and associated edges', async () => {
      const mockTx = {
        sql: vi.fn().mockResolvedValue({ rows: [] }),
      };

      mockSql.begin = vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      await store.deleteVibe('test-1');

      expect(mockSql.begin).toHaveBeenCalled();
    });
  });

  describe('saveEdge', () => {
    it('should insert edge into database', async () => {
      const edge = {
        from: 'vibe-1',
        to: 'vibe-2',
        type: 'related' as const,
        strength: 0.8,
      };

      await store.saveEdge(edge);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('INSERT INTO edges')])
      );
    });
  });

  describe('getEdges', () => {
    it('should retrieve all edges when no vibeId provided', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            from_vibe: 'vibe-1',
            to_vibe: 'vibe-2',
            type: 'related',
            strength: 0.8,
          },
        ],
      });

      const result = await store.getEdges();

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('vibe-1');
    });

    it('should retrieve edges for specific vibe', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      await store.getEdges('vibe-1');

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('WHERE from_vibe'),
        ])
      );
    });
  });

  describe('clearGraph', () => {
    it('should truncate tables', async () => {
      await store.clearGraph();

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('TRUNCATE vibes CASCADE')])
      );
    });
  });

  describe('findVibesByKeywords', () => {
    it('should find vibes by keywords using array operator', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      await store.findVibesByKeywords(['ai', 'tech']);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('WHERE keywords &&')])
      );
    });
  });

  describe('findVibesByEmbedding', () => {
    it('should find vibes by embedding similarity', async () => {
      const embedding = Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1));
      mockSql.mockResolvedValueOnce({ rows: [] });

      await store.findVibesByEmbedding(embedding, 10);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('embedding <=>'),
          expect.stringContaining('LIMIT'),
        ])
      );
    });
  });

  describe('findRecentVibes', () => {
    it('should find recent vibes ordered by timestamp', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      await store.findRecentVibes(10);

      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('ORDER BY timestamp DESC'),
          expect.stringContaining('LIMIT'),
        ])
      );
    });
  });
});
