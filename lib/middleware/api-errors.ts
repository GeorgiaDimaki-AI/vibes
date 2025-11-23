/**
 * API Error Handler
 *
 * Centralized error handling for API routes.
 * Converts various error types to appropriate HTTP responses.
 *
 * Key Responsibilities:
 * - Handle authentication errors (401)
 * - Handle rate limit errors (429)
 * - Handle validation errors (400)
 * - Handle not found errors (404)
 * - Handle server errors (500)
 * - Never expose sensitive error details in production
 *
 * Usage in API routes:
 * ```typescript
 * import { handleAPIError } from '@/lib/middleware/api-errors';
 *
 * export async function POST(request: Request) {
 *   try {
 *     // ... handle request
 *   } catch (error) {
 *     return handleAPIError(error);
 *   }
 * }
 * ```
 *
 * @module APIErrorHandler
 */

import { AuthenticationError, UserNotFoundError } from './auth';
import { RateLimitError, handleRateLimitError } from './rate-limit';

/**
 * Validation error class
 * Used for invalid input data
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error class
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends Error {
  constructor(
    public resource: string,
    public identifier?: string
  ) {
    super(`${resource} not found${identifier ? `: ${identifier}` : ''}`);
    this.name = 'NotFoundError';
  }
}

/**
 * Forbidden error class
 * Used when user doesn't have permission to access resource
 */
export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Handle API errors and convert to appropriate HTTP responses
 *
 * @param error The error to handle
 * @returns Response object with appropriate status code and message
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   try {
 *     const user = await requireAuth(request);
 *     await checkRateLimit(user.id);
 *     // ... process request
 *     return Response.json({ success: true });
 *   } catch (error) {
 *     return handleAPIError(error);
 *   }
 * }
 * ```
 */
export function handleAPIError(error: unknown): Response {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error for debugging (server-side only)
  console.error('API Error:', error);

  // Authentication errors (401)
  if (error instanceof AuthenticationError) {
    return Response.json(
      {
        error: 'Unauthorized',
        message: error.message,
      },
      { status: 401 }
    );
  }

  // User not found errors (404)
  if (error instanceof UserNotFoundError) {
    return Response.json(
      {
        error: 'User not found',
        message: 'Your account needs to be set up. Please contact support.',
      },
      { status: 404 }
    );
  }

  // Rate limit errors (429)
  if (error instanceof RateLimitError) {
    return handleRateLimitError(error);
  }

  // Validation errors (400)
  if (error instanceof ValidationError) {
    return Response.json(
      {
        error: 'Validation error',
        message: error.message,
        field: error.field,
        details: error.details,
      },
      { status: 400 }
    );
  }

  // Not found errors (404)
  if (error instanceof NotFoundError) {
    return Response.json(
      {
        error: 'Not found',
        message: error.message,
        resource: error.resource,
      },
      { status: 404 }
    );
  }

  // Forbidden errors (403)
  if (error instanceof ForbiddenError) {
    return Response.json(
      {
        error: 'Forbidden',
        message: error.message,
      },
      { status: 403 }
    );
  }

  // Generic Error objects
  if (error instanceof Error) {
    // Check for common error messages
    if (error.message.includes('not found')) {
      return Response.json(
        {
          error: 'Not found',
          message: isProduction ? 'Resource not found' : error.message,
        },
        { status: 404 }
      );
    }

    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return Response.json(
        {
          error: 'Forbidden',
          message: isProduction ? 'Access denied' : error.message,
        },
        { status: 403 }
      );
    }

    // Generic server error
    return Response.json(
      {
        error: 'Internal server error',
        message: isProduction ? 'An error occurred processing your request' : error.message,
      },
      { status: 500 }
    );
  }

  // Unknown error type
  return Response.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

/**
 * Validate required fields in request body
 * Throws ValidationError if any required field is missing
 *
 * @param body Request body object
 * @param requiredFields Array of required field names
 * @throws ValidationError if any field is missing
 *
 * @example
 * ```typescript
 * const body = await request.json();
 * validateRequiredFields(body, ['email', 'password']);
 * ```
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => !body[field]);

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      missingFields[0],
      { missingFields }
    );
  }
}

/**
 * Validate string length
 * Throws ValidationError if string doesn't meet length requirements
 *
 * @param value String to validate
 * @param fieldName Field name for error message
 * @param min Minimum length
 * @param max Maximum length
 * @throws ValidationError if length is invalid
 *
 * @example
 * ```typescript
 * validateStringLength(scenario.description, 'description', 5, 5000);
 * ```
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  min: number,
  max: number
): void {
  if (typeof value !== 'string') {
    throw new ValidationError(
      `${fieldName} must be a string`,
      fieldName
    );
  }

  if (value.length < min) {
    throw new ValidationError(
      `${fieldName} must be at least ${min} characters`,
      fieldName,
      { minLength: min, actualLength: value.length }
    );
  }

  if (value.length > max) {
    throw new ValidationError(
      `${fieldName} must be less than ${max} characters`,
      fieldName,
      { maxLength: max, actualLength: value.length }
    );
  }
}

/**
 * Validate email format
 * Throws ValidationError if email is invalid
 *
 * @param email Email to validate
 * @param fieldName Field name for error message
 * @throws ValidationError if email is invalid
 *
 * @example
 * ```typescript
 * validateEmail(user.email, 'email');
 * ```
 */
export function validateEmail(email: string, fieldName: string = 'email'): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(
      `${fieldName} must be a valid email address`,
      fieldName
    );
  }
}
