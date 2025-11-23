/**
 * Graph Storage Interface and Implementations
 */

import { Vibe, CulturalGraph, GraphEdge, UserProfile, AdviceHistory, UserFavorite } from '@/lib/types';
import { UsageMetrics } from '@/lib/users/analytics-service';

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

  // Advice history operations
  saveAdviceHistory(history: AdviceHistory): Promise<void>;
  getAdviceHistory(userId: string, limit?: number, offset?: number): Promise<AdviceHistory[]>;
  getAdviceHistoryItem(id: string): Promise<AdviceHistory | null>;
  updateAdviceRating(id: string, rating: number, feedback?: string): Promise<void>;
  updateAdviceHelpful(id: string, wasHelpful: boolean): Promise<void>;
  deleteAdviceHistory(id: string): Promise<void>;
  deleteAllAdviceHistory(userId: string): Promise<void>;

  // Favorites operations
  saveFavorite(favorite: UserFavorite): Promise<void>;
  getFavorites(userId: string, type?: string): Promise<UserFavorite[]>;
  getFavoriteById(id: string): Promise<UserFavorite | null>;
  deleteFavorite(id: string): Promise<void>;
  checkFavoriteExists(userId: string, type: string, referenceId: string): Promise<boolean>;

  // Analytics operations
  saveUsageMetrics(metrics: UsageMetrics): Promise<void>;
  getUsageMetrics(userId: string, month: string): Promise<UsageMetrics | null>;
  getUsageMetricsRange(userId: string, startMonth: string, endMonth: string): Promise<UsageMetrics[]>;
}
