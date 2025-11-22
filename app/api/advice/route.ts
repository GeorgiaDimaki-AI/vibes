/**
 * Advice API endpoint
 * POST /api/advice - Get advice for a scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';
import { Scenario } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const scenario: Scenario = body;

    // Validate scenario
    if (!scenario.description) {
      return NextResponse.json(
        { error: 'Scenario description is required' },
        { status: 400 }
      );
    }

    // Get advice
    const advice = await zeitgeist.getAdvice(scenario);

    return NextResponse.json(advice);
  } catch (error) {
    console.error('Advice generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate advice', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
