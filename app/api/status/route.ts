/**
 * Status API endpoint
 * GET /api/status - Get current graph status
 */

import { NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';

export async function GET() {
  try {
    const status = await zeitgeist.getGraphStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get status:', error);
    // SECURITY: Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        error: 'Failed to get status',
        details: isProduction ? undefined : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
