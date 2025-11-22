/**
 * Postgres Graph Store
 * Uses Vercel Postgres with pgvector for storage
 */

import { sql } from '@vercel/postgres';
import { GraphStore } from './store';
import { Vibe, CulturalGraph, GraphEdge } from '@/lib/types';

export class PostgresGraphStore implements GraphStore {
  async initialize(): Promise<void> {
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    // Vibes table
    await sql`
      CREATE TABLE IF NOT EXISTS vibes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        keywords TEXT[] NOT NULL,
        embedding vector(1536),
        strength REAL NOT NULL,
        sentiment TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        sources TEXT[],
        related_vibes TEXT[],
        influences TEXT[],
        demographics TEXT[],
        locations TEXT[],
        domains TEXT[],
        metadata JSONB,
        first_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        decay_rate REAL,
        current_relevance REAL NOT NULL DEFAULT 0.5,
        half_life REAL
      )
    `;

    // Add columns if they don't exist (migration for existing databases)
    try {
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS decay_rate REAL`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS current_relevance REAL NOT NULL DEFAULT 0.5`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS half_life REAL`;
    } catch (error) {
      console.log('Migration might have already run or columns exist');
    }

    // Create index on embeddings for similarity search
    await sql`
      CREATE INDEX IF NOT EXISTS vibes_embedding_idx
      ON vibes USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;

    // Edges table
    await sql`
      CREATE TABLE IF NOT EXISTS edges (
        from_vibe TEXT NOT NULL,
        to_vibe TEXT NOT NULL,
        type TEXT NOT NULL,
        strength REAL NOT NULL,
        PRIMARY KEY (from_vibe, to_vibe, type)
      )
    `;
  }

  async saveVibe(vibe: Vibe): Promise<void> {
    await sql`
      INSERT INTO vibes (
        id, name, description, category, keywords, embedding,
        strength, sentiment, timestamp, sources, related_vibes,
        influences, demographics, locations, domains, metadata,
        first_seen, last_seen, decay_rate, current_relevance, half_life
      ) VALUES (
        ${vibe.id},
        ${vibe.name},
        ${vibe.description},
        ${vibe.category},
        ${vibe.keywords},
        ${vibe.embedding ? `[${vibe.embedding.join(',')}]` : null},
        ${vibe.strength},
        ${vibe.sentiment},
        ${vibe.timestamp.toISOString()},
        ${vibe.sources},
        ${vibe.relatedVibes || []},
        ${vibe.influences || []},
        ${vibe.demographics || []},
        ${vibe.locations || []},
        ${vibe.domains || []},
        ${JSON.stringify(vibe.metadata || {})},
        ${vibe.firstSeen.toISOString()},
        ${vibe.lastSeen.toISOString()},
        ${vibe.decayRate || null},
        ${vibe.currentRelevance},
        ${vibe.halfLife || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        keywords = EXCLUDED.keywords,
        embedding = EXCLUDED.embedding,
        strength = EXCLUDED.strength,
        sentiment = EXCLUDED.sentiment,
        timestamp = EXCLUDED.timestamp,
        sources = EXCLUDED.sources,
        related_vibes = EXCLUDED.related_vibes,
        influences = EXCLUDED.influences,
        demographics = EXCLUDED.demographics,
        locations = EXCLUDED.locations,
        domains = EXCLUDED.domains,
        metadata = EXCLUDED.metadata,
        last_seen = EXCLUDED.last_seen,
        decay_rate = EXCLUDED.decay_rate,
        current_relevance = EXCLUDED.current_relevance,
        half_life = EXCLUDED.half_life
    `;
  }

  async saveVibes(vibes: Vibe[]): Promise<void> {
    for (const vibe of vibes) {
      await this.saveVibe(vibe);
    }
  }

  async getVibe(id: string): Promise<Vibe | null> {
    const result = await sql`SELECT * FROM vibes WHERE id = ${id}`;
    if (result.rows.length === 0) return null;
    return this.rowToVibe(result.rows[0]);
  }

  async getAllVibes(): Promise<Vibe[]> {
    const result = await sql`SELECT * FROM vibes ORDER BY timestamp DESC`;
    return result.rows.map(row => this.rowToVibe(row));
  }

  async deleteVibe(id: string): Promise<void> {
    await sql`DELETE FROM vibes WHERE id = ${id}`;
    await sql`DELETE FROM edges WHERE from_vibe = ${id} OR to_vibe = ${id}`;
  }

  async saveEdge(edge: GraphEdge): Promise<void> {
    await sql`
      INSERT INTO edges (from_vibe, to_vibe, type, strength)
      VALUES (${edge.from}, ${edge.to}, ${edge.type}, ${edge.strength})
      ON CONFLICT (from_vibe, to_vibe, type) DO UPDATE SET
        strength = EXCLUDED.strength
    `;
  }

  async getEdges(vibeId?: string): Promise<GraphEdge[]> {
    const result = vibeId
      ? await sql`SELECT * FROM edges WHERE from_vibe = ${vibeId} OR to_vibe = ${vibeId}`
      : await sql`SELECT * FROM edges`;

    return result.rows.map(row => ({
      from: row.from_vibe,
      to: row.to_vibe,
      type: row.type,
      strength: row.strength,
    }));
  }

  async getGraph(): Promise<CulturalGraph> {
    const vibes = await this.getAllVibes();
    const edges = await this.getEdges();

    return {
      vibes: new Map(vibes.map(v => [v.id, v])),
      edges,
      metadata: {
        lastUpdated: new Date(),
        vibeCount: vibes.length,
        version: '1.0',
      },
    };
  }

  async clearGraph(): Promise<void> {
    await sql`TRUNCATE vibes, edges`;
  }

  async findVibesByKeywords(keywords: string[]): Promise<Vibe[]> {
    const result = await sql`
      SELECT * FROM vibes
      WHERE keywords && ${keywords}
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    return result.rows.map(row => this.rowToVibe(row));
  }

  async findVibesByEmbedding(embedding: number[], topK = 10): Promise<Vibe[]> {
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await sql`
      SELECT *, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM vibes
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `;

    return result.rows.map(row => this.rowToVibe(row));
  }

  async findRecentVibes(limit: number): Promise<Vibe[]> {
    const result = await sql`
      SELECT * FROM vibes
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
    return result.rows.map(row => this.rowToVibe(row));
  }

  private rowToVibe(row: any): Vibe {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      keywords: row.keywords,
      embedding: row.embedding,
      strength: row.strength,
      sentiment: row.sentiment,
      timestamp: new Date(row.timestamp),
      sources: row.sources || [],
      relatedVibes: row.related_vibes || [],
      influences: row.influences || [],
      demographics: row.demographics || [],
      locations: row.locations || [],
      domains: row.domains || [],
      metadata: row.metadata || {},
      firstSeen: new Date(row.first_seen || row.timestamp),
      lastSeen: new Date(row.last_seen || row.timestamp),
      decayRate: row.decay_rate,
      currentRelevance: row.current_relevance || 0.5,
      halfLife: row.half_life,
    };
  }
}

// Global store instance
export const graphStore = new PostgresGraphStore();
