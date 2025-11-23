/**
 * Cron API endpoint
 * GET /api/cron - Automated data collection (triggered by Vercel Cron)
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

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // SECURITY: CRON_SECRET must be set - no bypass allowed
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  // SECURITY: Use constant-time comparison to prevent timing attacks
  const expectedAuth = `Bearer ${cronSecret}`;
  if (!authHeader || !secureCompare(authHeader, expectedAuth)) {
    console.warn('Unauthorized cron access attempt', {
      ip: request.headers.get('x-forwarded-for'),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Cron job started:', new Date().toISOString());

    const result = await zeitgeist.updateGraph({
      limit: 50, // Collect more items for cron jobs
    });

    console.log('Cron job completed:', result);

    return NextResponse.json({
      success: true,
      vibesAdded: result.vibesAdded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    // SECURITY: Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: isProduction ? undefined : (error instanceof Error ? error.message : 'Unknown error'),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
