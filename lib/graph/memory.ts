/**
 * In-Memory Graph Store
 * For development and testing
 */

import { GraphStore } from './store';
import { Vibe, CulturalGraph, GraphEdge, UserProfile, AdviceHistory, UserFavorite } from '@/lib/types';

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

export class MemoryGraphStore implements GraphStore {
  private static readonly MAX_VIBES = 100000; // Prevent unbounded memory growth
  private static readonly MAX_USERS = 10000; // Prevent unbounded memory growth
  private static readonly MAX_HISTORY = 100000; // Prevent unbounded memory growth
  private static readonly MAX_FAVORITES = 50000; // Prevent unbounded memory growth
  private vibes = new Map<string, Vibe>();
  private edges = new Map<string, GraphEdge>();
  private edgesByVibe = new Map<string, Set<string>>(); // Index for fast edge lookup
  private users = new Map<string, UserProfile>(); // User profiles by ID
  private usersByEmail = new Map<string, string>(); // Email -> User ID mapping
  private adviceHistory = new Map<string, AdviceHistory>(); // History by ID
  private historyByUser = new Map<string, string[]>(); // User ID -> History IDs
  private favorites = new Map<string, UserFavorite>(); // Favorites by ID
  private favoritesByUser = new Map<string, string[]>(); // User ID -> Favorite IDs

  private edgeKey(from: string, to: string, type: string): string {
    return `${from}:${to}:${type}`;
  }

  async saveVibe(vibe: Vibe): Promise<void> {
    // Validate embedding
    validateEmbedding(vibe.embedding);

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
    // Validate query embedding
    validateEmbedding(embedding);

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

  /**
   * Save a user profile
   */
  async saveUser(user: UserProfile): Promise<void> {
    // Check size limit
    if (this.users.size >= MemoryGraphStore.MAX_USERS && !this.users.has(user.id)) {
      throw new Error(`Memory store full: max ${MemoryGraphStore.MAX_USERS} users`);
    }

    // Update email index if email changed
    const existingUser = this.users.get(user.id);
    if (existingUser && existingUser.email !== user.email) {
      this.usersByEmail.delete(existingUser.email);
    }

    // Deep copy to prevent mutations
    this.users.set(user.id, structuredClone(user));
    this.usersByEmail.set(user.email, user.id);
  }

  /**
   * Get a user by ID
   */
  async getUser(userId: string): Promise<UserProfile | null> {
    const user = this.users.get(userId);
    return user ? structuredClone(user) : null;
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const userId = this.usersByEmail.get(email);
    if (!userId) return null;
    return this.getUser(userId);
  }

  /**
   * Update a user profile
   */
  async updateUser(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new Error(`User ${userId} not found`);
    }

    const updatedUser: UserProfile = { ...existingUser, ...updates };
    await this.saveUser(updatedUser);
    return updatedUser;
  }

  /**
   * Delete a user and all their data
   */
  async deleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.usersByEmail.delete(user.email);
      this.users.delete(userId);
    }
  }

  /**
   * Increment query count for a user
   */
  async incrementQueryCount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    user.queriesThisMonth += 1;
    user.lastActive = new Date();
  }

  /**
   * Reset monthly query counts for all users (cron job)
   */
  async resetMonthlyQueries(): Promise<void> {
    for (const user of this.users.values()) {
      user.queriesThisMonth = 0;
    }
  }

  /**
   * Save advice history
   */
  async saveAdviceHistory(history: AdviceHistory): Promise<void> {
    // Check size limit
    if (this.adviceHistory.size >= MemoryGraphStore.MAX_HISTORY && !this.adviceHistory.has(history.id)) {
      throw new Error(`Memory store full: max ${MemoryGraphStore.MAX_HISTORY} history items`);
    }

    // Deep copy to prevent mutations
    this.adviceHistory.set(history.id, structuredClone(history));

    // Update user index
    if (!this.historyByUser.has(history.userId)) {
      this.historyByUser.set(history.userId, []);
    }
    this.historyByUser.get(history.userId)!.push(history.id);
  }

  /**
   * Get advice history for a user
   */
  async getAdviceHistory(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<AdviceHistory[]> {
    const historyIds = this.historyByUser.get(userId) || [];

    // Get all history items for this user
    const items = historyIds
      .map(id => this.adviceHistory.get(id))
      .filter((item): item is AdviceHistory => item !== undefined);

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    return items.slice(offset, offset + limit).map(item => structuredClone(item));
  }

  /**
   * Get a specific advice history item
   */
  async getAdviceHistoryItem(id: string): Promise<AdviceHistory | null> {
    const item = this.adviceHistory.get(id);
    return item ? structuredClone(item) : null;
  }

  /**
   * Update advice rating
   */
  async updateAdviceRating(
    id: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    const item = this.adviceHistory.get(id);
    if (!item) {
      throw new Error(`History item ${id} not found`);
    }

    item.rating = rating as 1 | 2 | 3 | 4 | 5;
    if (feedback !== undefined) {
      item.feedback = feedback;
    }
  }

  /**
   * Update advice helpful status
   */
  async updateAdviceHelpful(id: string, wasHelpful: boolean): Promise<void> {
    const item = this.adviceHistory.get(id);
    if (!item) {
      throw new Error(`History item ${id} not found`);
    }

    item.wasHelpful = wasHelpful;
  }

  /**
   * Delete a specific advice history item
   */
  async deleteAdviceHistory(id: string): Promise<void> {
    const item = this.adviceHistory.get(id);
    if (item) {
      // Remove from user index
      const userHistoryIds = this.historyByUser.get(item.userId);
      if (userHistoryIds) {
        const index = userHistoryIds.indexOf(id);
        if (index > -1) {
          userHistoryIds.splice(index, 1);
        }
      }
      // Remove the item
      this.adviceHistory.delete(id);
    }
  }

  /**
   * Delete all advice history for a user
   */
  async deleteAllAdviceHistory(userId: string): Promise<void> {
    const historyIds = this.historyByUser.get(userId) || [];
    for (const id of historyIds) {
      this.adviceHistory.delete(id);
    }
    this.historyByUser.delete(userId);
  }

  /**
   * Save a favorite
   */
  async saveFavorite(favorite: UserFavorite): Promise<void> {
    // Check size limit
    if (this.favorites.size >= MemoryGraphStore.MAX_FAVORITES && !this.favorites.has(favorite.id)) {
      throw new Error(`Memory store full: max ${MemoryGraphStore.MAX_FAVORITES} favorites`);
    }

    // Deep copy to prevent mutations
    this.favorites.set(favorite.id, structuredClone(favorite));

    // Update user index
    if (!this.favoritesByUser.has(favorite.userId)) {
      this.favoritesByUser.set(favorite.userId, []);
    }
    this.favoritesByUser.get(favorite.userId)!.push(favorite.id);
  }

  /**
   * Get favorites for a user
   */
  async getFavorites(userId: string, type?: string): Promise<UserFavorite[]> {
    const favoriteIds = this.favoritesByUser.get(userId) || [];

    // Get all favorites for this user
    let items = favoriteIds
      .map(id => this.favorites.get(id))
      .filter((item): item is UserFavorite => item !== undefined);

    // Filter by type if specified
    if (type) {
      items = items.filter(item => item.type === type);
    }

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return items.map(item => structuredClone(item));
  }

  /**
   * Get a specific favorite by ID
   */
  async getFavoriteById(id: string): Promise<UserFavorite | null> {
    const favorite = this.favorites.get(id);
    return favorite ? structuredClone(favorite) : null;
  }

  /**
   * Delete a favorite
   */
  async deleteFavorite(id: string): Promise<void> {
    const favorite = this.favorites.get(id);
    if (favorite) {
      // Remove from user index
      const userFavoriteIds = this.favoritesByUser.get(favorite.userId);
      if (userFavoriteIds) {
        const index = userFavoriteIds.indexOf(id);
        if (index > -1) {
          userFavoriteIds.splice(index, 1);
        }
      }
      // Remove the favorite
      this.favorites.delete(id);
    }
  }

  /**
   * Check if a favorite exists
   */
  async checkFavoriteExists(
    userId: string,
    type: string,
    referenceId: string
  ): Promise<boolean> {
    const favoriteIds = this.favoritesByUser.get(userId) || [];

    for (const id of favoriteIds) {
      const favorite = this.favorites.get(id);
      if (favorite && favorite.type === type && favorite.referenceId === referenceId) {
        return true;
      }
    }

    return false;
  }
}

// Global store instance
export const memoryStore = new MemoryGraphStore();
