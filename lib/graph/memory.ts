/**
 * In-Memory Graph Store
 * For development and testing
 */

import { GraphStore } from './store';
import { Vibe, CulturalGraph, GraphEdge } from '@/lib/types';

export class MemoryGraphStore implements GraphStore {
  private static readonly MAX_VIBES = 100000; // Prevent unbounded memory growth
  private vibes = new Map<string, Vibe>();
  private edges = new Map<string, GraphEdge>();
  private edgesByVibe = new Map<string, Set<string>>(); // Index for fast edge lookup

  private edgeKey(from: string, to: string, type: string): string {
    return `${from}:${to}:${type}`;
  }

  async saveVibe(vibe: Vibe): Promise<void> {
    // Check size limit
    if (this.vibes.size >= MemoryGraphStore.MAX_VIBES && !this.vibes.has(vibe.id)) {
      throw new Error(`Memory store full: max ${MemoryGraphStore.MAX_VIBES} vibes`);
    }

    // Deep copy to prevent mutations
    this.vibes.set(vibe.id, structuredClone(vibe));
  }

  async saveVibes(vibes: Vibe[]): Promise<void> {
    for (const vibe of vibes) {
      await this.saveVibe(vibe);
    }
  }

  async getVibe(id: string): Promise<Vibe | null> {
    const vibe = this.vibes.get(id);
    return vibe ? structuredClone(vibe) : null;
  }

  async getAllVibes(): Promise<Vibe[]> {
    return Array.from(this.vibes.values()).map(v => structuredClone(v));
  }

  async deleteVibe(id: string): Promise<void> {
    this.vibes.delete(id);

    // Delete associated edges efficiently using index
    const edgeKeys = this.edgesByVibe.get(id) || new Set();
    for (const key of edgeKeys) {
      const edge = this.edges.get(key);
      if (edge) {
        // Remove from both vibe indexes
        this.edgesByVibe.get(edge.from)?.delete(key);
        this.edgesByVibe.get(edge.to)?.delete(key);
        this.edges.delete(key);
      }
    }
    this.edgesByVibe.delete(id);
  }

  async saveEdge(edge: GraphEdge): Promise<void> {
    const key = this.edgeKey(edge.from, edge.to, edge.type);
    this.edges.set(key, edge);

    // Maintain reverse index for fast lookups by vibe ID
    if (!this.edgesByVibe.has(edge.from)) {
      this.edgesByVibe.set(edge.from, new Set());
    }
    if (!this.edgesByVibe.has(edge.to)) {
      this.edgesByVibe.set(edge.to, new Set());
    }
    this.edgesByVibe.get(edge.from)!.add(key);
    this.edgesByVibe.get(edge.to)!.add(key);
  }

  async getEdges(vibeId?: string): Promise<GraphEdge[]> {
    if (!vibeId) {
      return Array.from(this.edges.values());
    }

    // Use index for fast lookup - O(1) instead of O(n)
    const edgeKeys = this.edgesByVibe.get(vibeId) || new Set();
    return Array.from(edgeKeys)
      .map(key => this.edges.get(key))
      .filter((e): e is GraphEdge => e !== undefined);
  }

  async getGraph(): Promise<CulturalGraph> {
    return {
      vibes: new Map(this.vibes),
      edges: Array.from(this.edges.values()),
      metadata: {
        lastUpdated: new Date(),
        vibeCount: this.vibes.size,
        version: '1.0',
      },
    };
  }

  async clearGraph(): Promise<void> {
    this.vibes.clear();
    this.edges.clear();
    this.edgesByVibe.clear();
  }

  async findVibesByKeywords(keywords: string[]): Promise<Vibe[]> {
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
    return Array.from(this.vibes.values()).filter(vibe =>
      vibe.keywords.some(k => keywordSet.has(k.toLowerCase()))
    );
  }

  async findVibesByEmbedding(embedding: number[], topK = 10): Promise<Vibe[]> {
    const vibesWithEmbeddings = Array.from(this.vibes.values())
      .filter(v => v.embedding && v.embedding.length === embedding.length);

    const scored = vibesWithEmbeddings.map(vibe => ({
      vibe,
      similarity: this.cosineSimilarity(embedding, vibe.embedding!),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK).map(s => s.vibe);
  }

  async findRecentVibes(limit: number): Promise<Vibe[]> {
    const vibes = Array.from(this.vibes.values());
    vibes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return vibes.slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }
}

// Global store instance
export const memoryStore = new MemoryGraphStore();
