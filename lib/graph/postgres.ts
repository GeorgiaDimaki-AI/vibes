/**
 * Postgres Graph Store
 * Uses Vercel Postgres with pgvector for storage
 */

import { sql } from '@vercel/postgres';
import { GraphStore } from './store';
import { Vibe, CulturalGraph, GraphEdge } from '@/lib/types';

/**
 * Validate embedding dimensions and values
 */
function validateEmbedding(embedding: number[] | undefined): void {
  if (!embedding) return;

  const validDimensions = [768, 1536]; // Support Ollama (768) and OpenAI (1536)
  if (!validDimensions.includes(embedding.length)) {
    throw new Error(
      `Invalid embedding dimension: ${embedding.length}. ` +
      `Expected 768 (Ollama/nomic-embed-text) or 1536 (OpenAI/text-embedding-3-small)`
    );
  }

  // Validate all values are valid numbers
  if (!embedding.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
    throw new Error('Embedding contains invalid values (NaN or Infinity)');
  }
}

/**
 * Pad embedding to 1536 dimensions (for Ollama 768-dim embeddings)
 */
function padEmbedding(embedding: number[] | undefined): number[] | null {
  if (!embedding) return null;

  // If already 1536, return as-is
  if (embedding.length === 1536) {
    return embedding;
  }

  // If 768, pad with zeros to 1536
  if (embedding.length === 768) {
    return [...embedding, ...Array(768).fill(0)];
  }

  // Should never reach here due to validation, but just in case
  throw new Error(`Cannot pad embedding of dimension ${embedding.length}`);
}

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
        half_life REAL,
        geography JSONB
      )
    `;

    // Add columns if they don't exist (migration for existing databases)
    try {
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS decay_rate REAL`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS current_relevance REAL NOT NULL DEFAULT 0.5`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS half_life REAL`;
      await sql`ALTER TABLE vibes ADD COLUMN IF NOT EXISTS geography JSONB`;
    } catch (error: any) {
      // Check if error is "column already exists" - that's expected
      if (error.message && !error.message.includes('already exists')) {
        console.error('Migration failed:', error);
        throw error;
      }
    }

    // Create indexes for performance
    // IVFFlat index for vector similarity (lists = sqrt(expected_rows))
    // Using 316 for ~100K expected vibes (sqrt(100000) ≈ 316)
    await sql`
      CREATE INDEX IF NOT EXISTS vibes_embedding_idx
      ON vibes USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 316)
    `;

    // Index on keywords for findVibesByKeywords() - GIN index for array operations
    await sql`
      CREATE INDEX IF NOT EXISTS vibes_keywords_gin_idx
      ON vibes USING GIN (keywords)
    `;

    // Index on timestamp for getAllVibes() and findRecentVibes()
    await sql`
      CREATE INDEX IF NOT EXISTS vibes_timestamp_idx
      ON vibes (timestamp DESC)
    `;

    // Index on category for filtering
    await sql`
      CREATE INDEX IF NOT EXISTS vibes_category_idx
      ON vibes (category)
    `;

    // Edges table with foreign key constraints for referential integrity
    await sql`
      CREATE TABLE IF NOT EXISTS edges (
        from_vibe TEXT NOT NULL,
        to_vibe TEXT NOT NULL,
        type TEXT NOT NULL,
        strength REAL NOT NULL,
        PRIMARY KEY (from_vibe, to_vibe, type)
      )
    `;

    // Add foreign key constraints if they don't exist
    // This ensures referential integrity - no orphaned edges
    try {
      await sql`
        ALTER TABLE edges
        ADD CONSTRAINT edges_from_vibe_fkey
        FOREIGN KEY (from_vibe) REFERENCES vibes(id) ON DELETE CASCADE
      `;
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.error('Failed to add edges_from_vibe_fkey constraint:', error);
      }
    }

    try {
      await sql`
        ALTER TABLE edges
        ADD CONSTRAINT edges_to_vibe_fkey
        FOREIGN KEY (to_vibe) REFERENCES vibes(id) ON DELETE CASCADE
      `;
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.error('Failed to add edges_to_vibe_fkey constraint:', error);
      }
    }

    // Indexes on edges for getEdges() performance
    await sql`
      CREATE INDEX IF NOT EXISTS edges_from_vibe_idx
      ON edges (from_vibe)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS edges_to_vibe_idx
      ON edges (to_vibe)
    `;
  }

  async saveVibe(vibe: Vibe): Promise<void> {
    try {
      // Validate embedding before attempting to save
      validateEmbedding(vibe.embedding);

      // Pad embedding to 1536 if needed (768 -> 1536)
      const paddedEmbedding = padEmbedding(vibe.embedding);

      await sql`
        INSERT INTO vibes (
          id, name, description, category, keywords, embedding,
          strength, sentiment, timestamp, sources, related_vibes,
          influences, demographics, locations, domains, metadata,
          first_seen, last_seen, decay_rate, current_relevance, half_life,
          geography
        ) VALUES (
          ${vibe.id},
          ${vibe.name},
          ${vibe.description},
          ${vibe.category},
          ${vibe.keywords as any},
          ${paddedEmbedding ? `[${paddedEmbedding.join(',')}]` : null},
          ${vibe.strength},
          ${vibe.sentiment},
          ${vibe.timestamp.toISOString()},
          ${vibe.sources as any},
          ${(vibe.relatedVibes || []) as any},
          ${(vibe.influences || []) as any},
          ${(vibe.demographics || []) as any},
          ${(vibe.locations || []) as any},
          ${(vibe.domains || []) as any},
          ${JSON.stringify(vibe.metadata || {})},
          ${vibe.firstSeen.toISOString()},
          ${vibe.lastSeen.toISOString()},
          ${vibe.decayRate || null},
          ${vibe.currentRelevance},
          ${vibe.halfLife || null},
          ${vibe.geography ? JSON.stringify(vibe.geography) : null}
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
          half_life = EXCLUDED.half_life,
          geography = EXCLUDED.geography
      `;
    } catch (error: any) {
      console.error('Failed to save vibe:', {
        vibeId: vibe.id,
        vibeName: vibe.name,
        embeddingDim: vibe.embedding?.length,
        error: error.message,
      });
      throw new Error(`Failed to save vibe ${vibe.id}: ${error.message}`);
    }
  }

  async saveVibes(vibes: Vibe[]): Promise<void> {
    if (vibes.length === 0) return;

    try {
      // Validate all embeddings before saving
      for (const vibe of vibes) {
        validateEmbedding(vibe.embedding);
      }

      // Use transaction for atomicity - all or nothing
      await (sql as any).begin(async (tx: any) => {
        // For safety and to avoid SQL injection risks with string concatenation,
        // we use individual inserts within a transaction
        // This is slower than bulk insert but safer and still fast (transaction batching)
        for (const vibe of vibes) {
          const paddedEmbedding = padEmbedding(vibe.embedding);

          await tx`
            INSERT INTO vibes (
              id, name, description, category, keywords, embedding,
              strength, sentiment, timestamp, sources, related_vibes,
              influences, demographics, locations, domains, metadata,
              first_seen, last_seen, decay_rate, current_relevance, half_life,
              geography
            ) VALUES (
              ${vibe.id},
              ${vibe.name},
              ${vibe.description},
              ${vibe.category},
              ${vibe.keywords as any},
              ${paddedEmbedding ? `[${paddedEmbedding.join(',')}]` : null},
              ${vibe.strength},
              ${vibe.sentiment},
              ${vibe.timestamp.toISOString()},
              ${vibe.sources as any},
              ${(vibe.relatedVibes || []) as any},
              ${(vibe.influences || []) as any},
              ${(vibe.demographics || []) as any},
              ${(vibe.locations || []) as any},
              ${(vibe.domains || []) as any},
              ${JSON.stringify(vibe.metadata || {})},
              ${vibe.firstSeen.toISOString()},
              ${vibe.lastSeen.toISOString()},
              ${vibe.decayRate || null},
              ${vibe.currentRelevance},
              ${vibe.halfLife || null},
              ${vibe.geography ? JSON.stringify(vibe.geography) : null}
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
              half_life = EXCLUDED.half_life,
              geography = EXCLUDED.geography
          `;
        }
      });
    } catch (error: any) {
      console.error('Failed to save batch of vibes:', {
        count: vibes.length,
        error: error.message,
      });
      throw new Error(`Failed to save ${vibes.length} vibes: ${error.message}`);
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
    // With foreign key constraints ON DELETE CASCADE, edges are automatically deleted
    // But we keep explicit edge deletion for compatibility with databases where constraints might not exist
    await (sql as any).begin(async (tx: any) => {
      await tx`DELETE FROM edges WHERE from_vibe = ${id} OR to_vibe = ${id}`;
      await tx`DELETE FROM vibes WHERE id = ${id}`;
    });
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
    // CASCADE ensures referential integrity is maintained
    await sql`TRUNCATE vibes CASCADE`;
  }

  async findVibesByKeywords(keywords: string[]): Promise<Vibe[]> {
    const result = await sql`
      SELECT * FROM vibes
      WHERE keywords && ${keywords as any}
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    return result.rows.map(row => this.rowToVibe(row));
  }

  async findVibesByEmbedding(embedding: number[], topK = 10): Promise<Vibe[]> {
    try {
      // Validate and pad query embedding
      validateEmbedding(embedding);
      const paddedEmbedding = padEmbedding(embedding);

      if (!paddedEmbedding) {
        throw new Error('Embedding is required for similarity search');
      }

      const embeddingStr = `[${paddedEmbedding.join(',')}]`;

      const result = await sql`
        SELECT *, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM vibes
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${topK}
      `;

      return result.rows.map(row => this.rowToVibe(row));
    } catch (error: any) {
      console.error('Failed to find vibes by embedding:', {
        embeddingDim: embedding.length,
        topK,
        error: error.message,
      });
      throw new Error(`Embedding similarity search failed: ${error.message}`);
    }
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
      geography: row.geography || undefined,
    };
  }
}

// Global store instance
export const graphStore = new PostgresGraphStore();
