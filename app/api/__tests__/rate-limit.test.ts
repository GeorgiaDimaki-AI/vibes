/**
 * Rate Limiting Tests
 *
 * Tests for rate limiting middleware and enforcement.
 *
 * Test Coverage:
 * - Rate limiting enforced correctly
 * - Different tiers have different limits
 * - Monthly reset works
 * - Bypass for unlimited tier
 * - Proper error responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit, getRateLimitInfo, RateLimitError } from '@/lib/middleware/rate-limit';
import { UserService } from '@/lib/users/user-service';
import { UserProfile } from '@/lib/types';

// Mock UserService
vi.mock('@/lib/users/user-service', () => {
  const mockUsers = new Map<string, UserProfile>();

  return {
    UserService: vi.fn().mockImplementation(() => ({
      getUserProfile: vi.fn(async (userId: string) => mockUsers.get(userId) || null),
      canMakeQuery: vi.fn(async (userId: string) => {
        const user = mockUsers.get(userId);
        if (!user) return false;
        if (user.tier === 'unlimited') return true;
        return user.queriesThisMonth < user.queryLimit;
      }),
      incrementQueryCount: vi.fn(async (userId: string) => {
        const user = mockUsers.get(userId);
        if (user) {
          user.queriesThisMonth += 1;
          mockUsers.set(userId, user);
        }
      }),
    })),
    userService: {
      getUserProfile: vi.fn(async (userId: string) => mockUsers.get(userId) || null),
      canMakeQuery: vi.fn(async (userId: string) => {
        const user = mockUsers.get(userId);
        if (!user) return false;
        if (user.tier === 'unlimited') return true;
        return user.queriesThisMonth < user.queryLimit;
      }),
      incrementQueryCount: vi.fn(async (userId: string) => {
        const user = mockUsers.get(userId);
        if (user) {
          user.queriesThisMonth += 1;
          mockUsers.set(userId, user);
        }
      }),
    },
    __mockUsers: mockUsers,
  };
});

describe('Rate Limiting', () => {
  const mockUsers = (require('@/lib/users/user-service') as any).__mockUsers;

  beforeEach(() => {
    // Clear mock users before each test
    mockUsers.clear();
  });

  describe('checkRateLimit', () => {
    it('should allow queries within free tier limit (5)', async () => {
      const user: UserProfile = {
        id: 'user-free',
        email: 'free@test.com',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      // Should allow 5 queries
      for (let i = 0; i < 5; i++) {
        const info = await checkRateLimit(user.id);
        expect(info.allowed).toBe(true);
        expect(info.limit).toBe(5);
      }

      // 6th query should fail
      await expect(checkRateLimit(user.id)).rejects.toThrow(RateLimitError);
    });

    it('should allow queries within light tier limit (25)', async () => {
      const user: UserProfile = {
        id: 'user-light',
        email: 'light@test.com',
        tier: 'light',
        queriesThisMonth: 20,
        queryLimit: 25,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      // Should allow 5 more queries
      for (let i = 0; i < 5; i++) {
        const info = await checkRateLimit(user.id);
        expect(info.allowed).toBe(true);
        expect(info.limit).toBe(25);
      }

      // Next query should fail
      await expect(checkRateLimit(user.id)).rejects.toThrow(RateLimitError);
    });

    it('should allow queries within regular tier limit (100)', async () => {
      const user: UserProfile = {
        id: 'user-regular',
        email: 'regular@test.com',
        tier: 'regular',
        queriesThisMonth: 95,
        queryLimit: 100,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      // Should allow 5 more queries
      for (let i = 0; i < 5; i++) {
        const info = await checkRateLimit(user.id);
        expect(info.allowed).toBe(true);
        expect(info.limit).toBe(100);
      }

      // Next query should fail
      await expect(checkRateLimit(user.id)).rejects.toThrow(RateLimitError);
    });

    it('should bypass rate limiting for unlimited tier', async () => {
      const user: UserProfile = {
        id: 'user-unlimited',
        email: 'unlimited@test.com',
        tier: 'unlimited',
        queriesThisMonth: 1000,
        queryLimit: -1,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      // Should allow unlimited queries
      for (let i = 0; i < 100; i++) {
        const info = await checkRateLimit(user.id);
        expect(info.allowed).toBe(true);
        expect(info.limit).toBe(-1);
        expect(info.remaining).toBe(-1);
      }
    });

    it('should increment query count after successful check', async () => {
      const user: UserProfile = {
        id: 'user-test',
        email: 'test@test.com',
        tier: 'free',
        queriesThisMonth: 2,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      const info = await checkRateLimit(user.id);
      expect(info.remaining).toBe(2); // 5 - 3 (after increment)

      const updatedUser = mockUsers.get(user.id);
      expect(updatedUser?.queriesThisMonth).toBe(3);
    });

    it('should throw RateLimitError with correct details when limit exceeded', async () => {
      const user: UserProfile = {
        id: 'user-limit',
        email: 'limit@test.com',
        tier: 'free',
        queriesThisMonth: 5,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      try {
        await checkRateLimit(user.id);
        expect.fail('Should have thrown RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        const rateLimitError = error as RateLimitError;
        expect(rateLimitError.limit).toBe(5);
        expect(rateLimitError.remaining).toBe(0);
        expect(rateLimitError.resetDate).toBeInstanceOf(Date);
      }
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return current rate limit info without incrementing count', async () => {
      const user: UserProfile = {
        id: 'user-info',
        email: 'info@test.com',
        tier: 'light',
        queriesThisMonth: 10,
        queryLimit: 25,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      const info1 = await getRateLimitInfo(user.id);
      expect(info1.allowed).toBe(true);
      expect(info1.remaining).toBe(15);
      expect(info1.limit).toBe(25);

      // Should not increment count
      const info2 = await getRateLimitInfo(user.id);
      expect(info2.remaining).toBe(15); // Still 15
    });

    it('should return -1 for unlimited tier remaining queries', async () => {
      const user: UserProfile = {
        id: 'user-unlimited-info',
        email: 'unlimited-info@test.com',
        tier: 'unlimited',
        queriesThisMonth: 500,
        queryLimit: -1,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      const info = await getRateLimitInfo(user.id);
      expect(info.allowed).toBe(true);
      expect(info.remaining).toBe(-1);
      expect(info.limit).toBe(-1);
    });

    it('should indicate when user cannot make query', async () => {
      const user: UserProfile = {
        id: 'user-blocked',
        email: 'blocked@test.com',
        tier: 'free',
        queriesThisMonth: 5,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      const info = await getRateLimitInfo(user.id);
      expect(info.allowed).toBe(false);
      expect(info.remaining).toBe(0);
    });
  });

  describe('Monthly Reset', () => {
    it('should calculate reset date as first day of next month', async () => {
      const user: UserProfile = {
        id: 'user-reset',
        email: 'reset@test.com',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: [],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: false,
      };
      mockUsers.set(user.id, user);

      const info = await checkRateLimit(user.id);
      const resetDate = info.resetDate;

      // Should be first day of next month
      expect(resetDate.getDate()).toBe(1);
      expect(resetDate.getHours()).toBe(0);
      expect(resetDate.getMinutes()).toBe(0);
      expect(resetDate.getSeconds()).toBe(0);

      // Should be in the future
      expect(resetDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
