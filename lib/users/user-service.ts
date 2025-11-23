/**
 * User Service
 *
 * High-level service for user management operations.
 * Provides business logic layer on top of GraphStore's user methods.
 *
 * Key Responsibilities:
 * - User profile CRUD operations
 * - Usage tracking and rate limiting
 * - Tier-based query limits
 * - User data validation
 *
 * Usage:
 * ```typescript
 * import { userService } from '@/lib/users/user-service';
 *
 * const user = await userService.getUserProfile(userId);
 * const canQuery = await userService.canMakeQuery(userId);
 * await userService.incrementQueryCount(userId);
 * ```
 *
 * @module UserService
 */

import { GraphStore } from '@/lib/graph/store';
import { UserProfile } from '@/lib/types';

/**
 * Tier-based query limits (queries per month)
 */
const TIER_LIMITS = {
  free: 5,
  light: 25,
  regular: 100,
  unlimited: -1, // -1 means unlimited
} as const;

/**
 * User Service Class
 * Handles all user-related business logic
 */
export class UserService {
  private store: GraphStore;

  /**
   * Create a new UserService
   * @param store Optional GraphStore instance for dependency injection
   */
  constructor(store?: GraphStore) {
    this.store = store || this.getDefaultStore();
  }

  private getDefaultStore(): GraphStore {
    const { getGraphStore } = require('@/lib/graph');
    return getGraphStore();
  }

  /**
   * Get a user profile by ID
   * @param userId Clerk user ID
   * @returns UserProfile or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.store.getUser(userId);
  }

  /**
   * Get a user profile by email
   * @param email User's email address
   * @returns UserProfile or null if not found
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    return this.store.getUserByEmail(email);
  }

  /**
   * Create a new user profile
   * @param data Partial user data (minimum: id and email)
   * @returns Created UserProfile
   */
  async createUserProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    if (!data.id || !data.email) {
      throw new Error('User ID and email are required');
    }

    // Set defaults based on tier
    const tier = data.tier || 'free';
    const queryLimit = TIER_LIMITS[tier];

    const userProfile: UserProfile = {
      id: data.id,
      email: data.email,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      tier,
      queriesThisMonth: 0,
      queryLimit,
      region: data.region,
      interests: data.interests || [],
      avoidTopics: data.avoidTopics || [],
      conversationStyle: data.conversationStyle || 'casual',
      emailNotifications: data.emailNotifications !== undefined ? data.emailNotifications : true,
      shareDataForResearch: data.shareDataForResearch !== undefined ? data.shareDataForResearch : false,
      createdAt: new Date(),
      lastActive: new Date(),
      onboardingCompleted: data.onboardingCompleted || false,
    };

    await this.store.saveUser(userProfile);
    return userProfile;
  }

  /**
   * Update a user profile
   * @param userId User ID
   * @param updates Partial updates to apply
   * @returns Updated UserProfile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    // If tier is being updated, update query limit accordingly
    if (updates.tier) {
      updates.queryLimit = TIER_LIMITS[updates.tier];
    }

    return this.store.updateUser(userId, updates);
  }

  /**
   * Delete a user and all their data
   * @param userId User ID
   */
  async deleteUser(userId: string): Promise<void> {
    await this.store.deleteUser(userId);
  }

  /**
   * Increment the query count for a user
   * Should be called after each successful query
   * @param userId User ID
   */
  async incrementQueryCount(userId: string): Promise<void> {
    await this.store.incrementQueryCount(userId);
  }

  /**
   * Get current usage for a user this month
   * @param userId User ID
   * @returns Number of queries used this month
   */
  async getUsageThisMonth(userId: string): Promise<number> {
    const user = await this.getUserProfile(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    return user.queriesThisMonth;
  }

  /**
   * Check if a user can make a query based on their tier and usage
   * @param userId User ID
   * @returns true if user can make a query, false otherwise
   */
  async canMakeQuery(userId: string): Promise<boolean> {
    const user = await this.getUserProfile(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Unlimited tier has no limits
    if (user.tier === 'unlimited') {
      return true;
    }

    // Check if under limit
    return user.queriesThisMonth < user.queryLimit;
  }

  /**
   * Get queries remaining for a user this month
   * @param userId User ID
   * @returns Number of queries remaining (-1 for unlimited)
   */
  async getQueriesRemaining(userId: string): Promise<number> {
    const user = await this.getUserProfile(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Unlimited tier
    if (user.tier === 'unlimited') {
      return -1;
    }

    return Math.max(0, user.queryLimit - user.queriesThisMonth);
  }

  /**
   * Reset monthly query counts for all users
   * Should be called by a cron job on the 1st of each month
   */
  async resetMonthlyQueries(): Promise<void> {
    await this.store.resetMonthlyQueries();
  }

  /**
   * Sync user data from Clerk webhook
   * Called when Clerk sends user.created or user.updated events
   * @param clerkUser Clerk user data
   * @returns UserProfile
   */
  async syncFromClerk(clerkUser: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  }): Promise<UserProfile> {
    const email = clerkUser.email_addresses[0]?.email_address;
    if (!email) {
      throw new Error('User must have an email address');
    }

    // Check if user already exists
    const existingUser = await this.getUserProfile(clerkUser.id);

    if (existingUser) {
      // Update existing user
      const displayName = [clerkUser.first_name, clerkUser.last_name]
        .filter(Boolean)
        .join(' ') || existingUser.displayName;

      return this.updateUserProfile(clerkUser.id, {
        email,
        displayName,
        avatarUrl: clerkUser.image_url,
      });
    } else {
      // Create new user
      const displayName = [clerkUser.first_name, clerkUser.last_name]
        .filter(Boolean)
        .join(' ');

      return this.createUserProfile({
        id: clerkUser.id,
        email,
        displayName,
        avatarUrl: clerkUser.image_url,
      });
    }
  }
}

/**
 * Default user service instance
 * Use this in most cases unless you need dependency injection for testing
 */
export const userService = new UserService();
