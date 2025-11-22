/**
 * Cron API endpoint
 * GET /api/cron - Automated data collection (triggered by Vercel Cron)
 */

import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
