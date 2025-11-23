/**
 * Authentication Middleware
 *
 * Provides authentication utilities for protecting API routes.
 * Integrates with Clerk for user authentication and our UserService for profile management.
 *
 * Key Responsibilities:
 * - Verify user authentication via Clerk
 * - Load user profile from database
 * - Provide optional vs required auth patterns
 * - Handle authentication errors gracefully
 *
 * Usage in API routes:
 * ```typescript
 * import { requireAuth, getOptionalAuth } from '@/lib/middleware/auth';
 *
 * // Protected route - throws error if not authenticated
 * export async function POST(request: Request) {
 *   const user = await requireAuth(request);
 *   // user is guaranteed to be UserProfile
 * }
 *
 * // Optional auth - returns null if not authenticated
 * export async function GET(request: Request) {
 *   const user = await getOptionalAuth(request);
 *   // user is UserProfile | null
 * }
 * ```
 *
 * @module AuthMiddleware
 */

import { auth } from '@clerk/nextjs/server';
import { UserProfile } from '@/lib/types';
import { userService } from '@/lib/users/user-service';

/**
 * Authentication error class
 * Thrown when authentication is required but not provided
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * User not found error class
 * Thrown when authenticated user doesn't exist in our database
 */
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User ${userId} not found in database`);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Require authentication for an API route
 * Throws AuthenticationError if user is not authenticated
 * Throws UserNotFoundError if user is not in database
 *
 * @param request The incoming Request object
 * @returns UserProfile of the authenticated user
 * @throws AuthenticationError if not authenticated
 * @throws UserNotFoundError if user not in database
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   try {
 *     const user = await requireAuth(request);
 *     // Use user.id, user.tier, etc.
 *   } catch (error) {
 *     if (error instanceof AuthenticationError) {
 *       return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export async function requireAuth(request: Request): Promise<UserProfile> {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    throw new AuthenticationError('User is not authenticated');
  }

  // Load user profile from database
  const userProfile = await userService.getUserProfile(userId);

  if (!userProfile) {
    throw new UserNotFoundError(userId);
  }

  return userProfile;
}

/**
 * Get optional authentication for an API route
 * Returns null if user is not authenticated
 * Returns UserProfile if authenticated and exists in database
 *
 * @param request The incoming Request object
 * @returns UserProfile or null
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   const user = await getOptionalAuth(request);
 *   if (user) {
 *     // Provide personalized response
 *   } else {
 *     // Provide generic response
 *   }
 * }
 * ```
 */
export async function getOptionalAuth(request: Request): Promise<UserProfile | null> {
  try {
    const authResult = await auth();
    const userId = authResult.userId;

    if (!userId) {
      return null;
    }

    // Load user profile from database
    const userProfile = await userService.getUserProfile(userId);
    return userProfile;
  } catch (error) {
    // Log error but don't throw - this is optional auth
    console.error('Error in getOptionalAuth:', error);
    return null;
  }
}

/**
 * Get the current user ID from Clerk without loading the full profile
 * Useful for logging or simple checks
 *
 * @returns User ID or null
 */
export async function getCurrentUserId(): Promise<string | null> {
  const authResult = await auth();
  return authResult.userId;
}

/**
 * Check if the current user is authenticated
 * Returns boolean without throwing errors
 *
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return userId !== null;
}

/**
 * Helper function to handle auth errors in API routes
 * Converts auth errors to appropriate HTTP responses
 *
 * @param error The error to handle
 * @returns Response object with appropriate status code
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   try {
 *     const user = await requireAuth(request);
 *     // ... handle request
 *   } catch (error) {
 *     return handleAuthError(error);
 *   }
 * }
 * ```
 */
export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return Response.json(
      { error: 'Unauthorized', message: error.message },
      { status: 401 }
    );
  }

  if (error instanceof UserNotFoundError) {
    return Response.json(
      {
        error: 'User not found',
        message: 'Your account needs to be set up. Please contact support.',
      },
      { status: 404 }
    );
  }

  // Unknown error - don't expose details to client
  console.error('Unexpected auth error:', error);
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
