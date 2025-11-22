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
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
