/**
 * Graph Storage Interface and Implementations
 */

import { Vibe, CulturalGraph, GraphEdge } from '@/lib/types';

/**
 * Interface for graph storage
 * Implement this for different storage backends
 */
export interface GraphStore {
  // Vibe operations
  saveVibe(vibe: Vibe): Promise<void>;
  saveVibes(vibes: Vibe[]): Promise<void>;
  getVibe(id: string): Promise<Vibe | null>;
  getAllVibes(): Promise<Vibe[]>;
  deleteVibe(id: string): Promise<void>;

  // Edge operations
  saveEdge(edge: GraphEdge): Promise<void>;
  getEdges(vibeId?: string): Promise<GraphEdge[]>;

  // Graph operations
  getGraph(): Promise<CulturalGraph>;
  clearGraph(): Promise<void>;

  // Search operations
  findVibesByKeywords(keywords: string[]): Promise<Vibe[]>;
  findVibesByEmbedding(embedding: number[], topK?: number): Promise<Vibe[]>;
  findRecentVibes(limit: number): Promise<Vibe[]>;
}
