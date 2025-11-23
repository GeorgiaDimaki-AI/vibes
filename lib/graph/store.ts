/**
 * Graph Storage Interface and Implementations
 */

import { Vibe, CulturalGraph, GraphEdge, UserProfile } from '@/lib/types';

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

  // User management operations (Multi-User Support)
  saveUser(user: UserProfile): Promise<void>;
  getUser(userId: string): Promise<UserProfile | null>;
  getUserByEmail(email: string): Promise<UserProfile | null>;
  updateUser(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  deleteUser(userId: string): Promise<void>;
  incrementQueryCount(userId: string): Promise<void>;
  resetMonthlyQueries(): Promise<void>;
}
