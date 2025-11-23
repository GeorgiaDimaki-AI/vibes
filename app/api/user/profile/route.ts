/**
 * User Profile API endpoint
 * GET /api/user/profile - Get current user profile
 * PUT /api/user/profile - Update user profile
 * DELETE /api/user/profile - Delete user account
 *
 * AUTHENTICATION: Required - All methods require authentication
 * RATE LIMITING: Not enforced on profile management (read/update operations)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { userService } from '@/lib/users/user-service';
import { handleAPIError, ValidationError } from '@/lib/middleware/api-errors';
import { UserProfile, Region } from '@/lib/types';

/**
 * GET /api/user/profile
 * Get the current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userProfile = await requireAuth(request);

    // Return user profile (already loaded by requireAuth)
    return NextResponse.json(userProfile);
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * PUT /api/user/profile
 * Update the current user's profile
 *
 * Allowed updates:
 * - displayName
 * - region
 * - interests
 * - avoidTopics
 * - conversationStyle
 * - emailNotifications
 * - shareDataForResearch
 * - onboardingCompleted
 *
 * NOT allowed to update:
 * - id, email (managed by Clerk)
 * - tier, queriesThisMonth, queryLimit (managed by system)
 * - createdAt (immutable)
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const userProfile = await requireAuth(request);

    // Parse request body
    const body = await request.json();

    // Validate updates - only allow specific fields
    const allowedFields = [
      'displayName',
      'region',
      'interests',
      'avoidTopics',
      'conversationStyle',
      'emailNotifications',
      'shareDataForResearch',
      'onboardingCompleted',
    ];

    const updates: Partial<UserProfile> = {};

    // Filter and validate updates
    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.includes(key)) {
        throw new ValidationError(
          `Field "${key}" cannot be updated via this endpoint`,
          key
        );
      }

      // Validate specific fields
      if (key === 'displayName' && value !== null && value !== undefined) {
        if (typeof value !== 'string') {
          throw new ValidationError('displayName must be a string', 'displayName');
        }
        if (value.length > 100) {
          throw new ValidationError('displayName must be less than 100 characters', 'displayName');
        }
      }

      if (key === 'region' && value !== null && value !== undefined) {
        const validRegions: Region[] = [
          'Global', 'US-West', 'US-East', 'US-Central', 'US-South',
          'EU-UK', 'EU-Central', 'EU-North', 'Asia-Pacific', 'Latin-America',
          'Africa', 'Middle-East'
        ];
        if (!validRegions.includes(value as Region)) {
          throw new ValidationError(
            `Invalid region. Must be one of: ${validRegions.join(', ')}`,
            'region'
          );
        }
      }

      if (key === 'interests' || key === 'avoidTopics') {
        if (!Array.isArray(value)) {
          throw new ValidationError(`${key} must be an array`, key);
        }
        if (value.length > 20) {
          throw new ValidationError(`${key} must have at most 20 items`, key);
        }
        if (value.some((item: any) => typeof item !== 'string')) {
          throw new ValidationError(`${key} must contain only strings`, key);
        }
      }

      if (key === 'conversationStyle' && value !== null && value !== undefined) {
        const validStyles = ['casual', 'professional', 'academic', 'friendly'];
        if (!validStyles.includes(value as string)) {
          throw new ValidationError(
            `Invalid conversationStyle. Must be one of: ${validStyles.join(', ')}`,
            'conversationStyle'
          );
        }
      }

      if (key === 'emailNotifications' || key === 'shareDataForResearch' || key === 'onboardingCompleted') {
        if (typeof value !== 'boolean') {
          throw new ValidationError(`${key} must be a boolean`, key);
        }
      }

      // Add to updates
      (updates as any)[key] = value;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Update user profile
    const updatedProfile = await userService.updateUserProfile(userProfile.id, updates);

    return NextResponse.json(updatedProfile);
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/user/profile
 * Delete the current user's account
 *
 * This will:
 * - Delete user profile from database
 * - Delete all user history and favorites
 * - NOT delete Clerk account (user must do that separately)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const userProfile = await requireAuth(request);

    // Parse request body to confirm deletion
    const body = await request.json().catch(() => ({}));

    // Require confirmation
    if (body.confirm !== true) {
      throw new ValidationError(
        'Account deletion requires confirmation. Send { "confirm": true } in request body.',
        'confirm'
      );
    }

    // Delete user
    await userService.deleteUser(userProfile.id);

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
