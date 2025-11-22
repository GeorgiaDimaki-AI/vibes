/**
 * In-Memory Graph Store
 * For development and testing
 */

import { GraphStore } from './store';
import { Vibe, CulturalGraph, GraphEdge } from '@/lib/types';

export class MemoryGraphStore implements GraphStore {
  private vibes = new Map<string, Vibe>();
  private edges: GraphEdge[] = [];

  async saveVibe(vibe: Vibe): Promise<void> {
    this.vibes.set(vibe.id, { ...vibe });
  }

  async saveVibes(vibes: Vibe[]): Promise<void> {
    for (const vibe of vibes) {
      await this.saveVibe(vibe);
    }
  }

  async getVibe(id: string): Promise<Vibe | null> {
    return this.vibes.get(id) || null;
  }

  async getAllVibes(): Promise<Vibe[]> {
    return Array.from(this.vibes.values());
  }

  async deleteVibe(id: string): Promise<void> {
    this.vibes.delete(id);
    this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
  }

  async saveEdge(edge: GraphEdge): Promise<void> {
    const idx = this.edges.findIndex(
      e => e.from === edge.from && e.to === edge.to && e.type === edge.type
    );

    if (idx >= 0) {
      this.edges[idx] = edge;
    } else {
      this.edges.push(edge);
    }
  }

  async getEdges(vibeId?: string): Promise<GraphEdge[]> {
    if (!vibeId) return [...this.edges];
    return this.edges.filter(e => e.from === vibeId || e.to === vibeId);
  }

  async getGraph(): Promise<CulturalGraph> {
    return {
      vibes: new Map(this.vibes),
      edges: [...this.edges],
      metadata: {
        lastUpdated: new Date(),
        vibeCount: this.vibes.size,
        version: '1.0',
      },
    };
  }

  async clearGraph(): Promise<void> {
    this.vibes.clear();
    this.edges = [];
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

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Global store instance
export const memoryStore = new MemoryGraphStore();
