/**
 * Collect API endpoint
 * POST /api/collect - Trigger data collection and graph update
 *
 * SECURITY: This is a resource-intensive operation that requires authentication.
 * Set INTERNAL_API_KEY environment variable to enable this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { zeitgeist } from '@/lib';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  try {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // SECURITY: Require API key for this resource-intensive operation
  const apiKey = request.headers.get('x-api-key');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  // In development, allow requests without API key for easier testing
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment) {
    if (!internalApiKey) {
      console.error('INTERNAL_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (!apiKey || !secureCompare(apiKey, internalApiKey)) {
      console.warn('Unauthorized collect access attempt', {
        ip: request.headers.get('x-forwarded-for'),
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Unauthorized - valid API key required' },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const options = body.options || {};

    console.log('Starting data collection...', {
      ip: request.headers.get('x-forwarded-for'),
      timestamp: new Date().toISOString(),
    });

    const result = await zeitgeist.updateGraph(options);

    return NextResponse.json({
      success: true,
      vibesAdded: result.vibesAdded,
      message: `Successfully collected and analyzed data. Added ${result.vibesAdded} vibes.`,
    });
  } catch (error) {
    console.error('Collection failed:', error);
    // SECURITY: Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to collect data',
        details: isProduction ? undefined : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
