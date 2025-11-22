/**
 * Collect API endpoint
 * POST /api/collect - Trigger data collection and graph update
 */

import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const options = body.options || {};

    console.log('Starting data collection...');
    const result = await zeitgeist.updateGraph(options);

    return NextResponse.json({
      success: true,
      vibesAdded: result.vibesAdded,
      message: `Successfully collected and analyzed data. Added ${result.vibesAdded} vibes.`,
    });
  } catch (error) {
    console.error('Collection failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to collect data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Allow GET as well for easy testing
export async function GET() {
  try {
    console.log('Starting data collection (GET)...');
    const result = await zeitgeist.updateGraph();

    return NextResponse.json({
      success: true,
      vibesAdded: result.vibesAdded,
      message: `Successfully collected and analyzed data. Added ${result.vibesAdded} vibes.`,
    });
  } catch (error) {
    console.error('Collection failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to collect data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
