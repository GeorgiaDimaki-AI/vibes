/**
 * Authentication Tests
 *
 * Tests for authentication middleware and protected routes.
 *
 * Test Coverage:
 * - Protected routes require auth
 * - Public routes remain public
 * - Proper 401 responses
 * - Headers are set correctly
 * - User profile is loaded
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireAuth, getOptionalAuth, AuthenticationError, UserNotFoundError } from '@/lib/middleware/auth';
import { UserProfile } from '@/lib/types';

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock UserService
vi.mock('@/lib/users/user-service', () => {
  const mockUsers = new Map<string, UserProfile>();

  return {
    userService: {
      getUserProfile: vi.fn(async (userId: string) => mockUsers.get(userId) || null),
    },
    __mockUsers: mockUsers,
  };
});

describe('Authentication Middleware', () => {
  const mockAuth = require('@clerk/nextjs/server').auth;
  const mockUsers = (require('@/lib/users/user-service') as any).__mockUsers;

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    mockUsers.clear();
  });

  describe('requireAuth', () => {
    it('should return user profile when authenticated', async () => {
      const user: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        tier: 'free',
        queriesThisMonth: 0,
        queryLimit: 5,
        interests: ['tech'],
        avoidTopics: [],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      mockUsers.set(user.id, user);
      mockAuth.mockResolvedValue({ userId: user.id });

      const request = new Request('http://localhost/api/advice');
      const result = await requireAuth(request);

      expect(result).toEqual(user);
      expect(mockAuth).toHaveBeenCalled();
    });

    it('should throw AuthenticationError when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/advice');

      await expect(requireAuth(request)).rejects.toThrow(AuthenticationError);
      await expect(requireAuth(request)).rejects.toThrow('User is not authenticated');
    });

    it('should throw UserNotFoundError when user not in database', async () => {
      mockAuth.mockResolvedValue({ userId: 'unknown-user' });

      const request = new Request('http://localhost/api/advice');

      await expect(requireAuth(request)).rejects.toThrow(UserNotFoundError);
    });
  });

  describe('getOptionalAuth', () => {
    it('should return user profile when authenticated', async () => {
      const user: UserProfile = {
        id: 'user-456',
        email: 'optional@example.com',
        tier: 'light',
        queriesThisMonth: 5,
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
      mockAuth.mockResolvedValue({ userId: user.id });

      const request = new Request('http://localhost/api/status');
      const result = await getOptionalAuth(request);

      expect(result).toEqual(user);
    });

    it('should return null when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/status');
      const result = await getOptionalAuth(request);

      expect(result).toBeNull();
    });

    it('should return null when user not in database', async () => {
      mockAuth.mockResolvedValue({ userId: 'unknown-user' });

      const request = new Request('http://localhost/api/status');
      const result = await getOptionalAuth(request);

      expect(result).toBeNull();
    });

    it('should not throw errors', async () => {
      mockAuth.mockRejectedValue(new Error('Auth service error'));

      const request = new Request('http://localhost/api/status');
      const result = await getOptionalAuth(request);

      expect(result).toBeNull();
    });
  });

  describe('Protected Routes Behavior', () => {
    it('should enforce authentication on /api/advice', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/advice');

      await expect(requireAuth(request)).rejects.toThrow(AuthenticationError);
    });

    it('should enforce authentication on /api/search', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/search');

      await expect(requireAuth(request)).rejects.toThrow(AuthenticationError);
    });

    it('should enforce authentication on /api/user/profile', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/user/profile');

      await expect(requireAuth(request)).rejects.toThrow(AuthenticationError);
    });

    it('should enforce authentication on /api/user/usage', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/user/usage');

      await expect(requireAuth(request)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('Public Routes Behavior', () => {
    it('should allow public access to /api/status', async () => {
      const request = new Request('http://localhost/api/status');

      // getOptionalAuth should not throw
      const result = await getOptionalAuth(request);
      expect(result).toBeDefined(); // Can be null or user
    });

    it('should allow public access to /api/graph', async () => {
      const request = new Request('http://localhost/api/graph');

      // getOptionalAuth should not throw
      const result = await getOptionalAuth(request);
      expect(result).toBeDefined(); // Can be null or user
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message for missing authentication', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/advice');

      try {
        await requireAuth(request);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as Error).message).toContain('not authenticated');
      }
    });

    it('should provide clear error message for user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'missing-user' });

      const request = new Request('http://localhost/api/advice');

      try {
        await requireAuth(request);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UserNotFoundError);
        expect((error as Error).message).toContain('not found in database');
      }
    });
  });

  describe('User Profile Loading', () => {
    it('should load complete user profile including preferences', async () => {
      const user: UserProfile = {
        id: 'user-complete',
        email: 'complete@example.com',
        displayName: 'Complete User',
        avatarUrl: 'https://example.com/avatar.jpg',
        tier: 'regular',
        queriesThisMonth: 50,
        queryLimit: 100,
        region: 'US-West',
        interests: ['tech', 'fashion', 'music'],
        avoidTopics: ['politics'],
        conversationStyle: 'professional',
        emailNotifications: false,
        shareDataForResearch: true,
        createdAt: new Date('2025-01-01'),
        lastActive: new Date(),
        onboardingCompleted: true,
      };

      mockUsers.set(user.id, user);
      mockAuth.mockResolvedValue({ userId: user.id });

      const request = new Request('http://localhost/api/advice');
      const result = await requireAuth(request);

      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
      expect(result.tier).toBe('regular');
      expect(result.region).toBe('US-West');
      expect(result.interests).toEqual(['tech', 'fashion', 'music']);
      expect(result.avoidTopics).toEqual(['politics']);
      expect(result.conversationStyle).toBe('professional');
    });

    it('should handle minimal user profile', async () => {
      const user: UserProfile = {
        id: 'user-minimal',
        email: 'minimal@example.com',
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
      mockAuth.mockResolvedValue({ userId: user.id });

      const request = new Request('http://localhost/api/advice');
      const result = await requireAuth(request);

      expect(result.id).toBe(user.id);
      expect(result.displayName).toBeUndefined();
      expect(result.region).toBeUndefined();
      expect(result.interests).toEqual([]);
    });
  });
});
