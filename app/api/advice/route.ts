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

    // SECURITY: Validate scenario description
    if (!scenario.description) {
      return NextResponse.json(
        { error: 'Scenario description is required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate description type
    if (typeof scenario.description !== 'string') {
      return NextResponse.json(
        { error: 'Scenario description must be a string' },
        { status: 400 }
      );
    }

    // SECURITY: Validate description length to prevent DoS
    if (scenario.description.length < 5) {
      return NextResponse.json(
        { error: 'Scenario description must be at least 5 characters' },
        { status: 400 }
      );
    }

    if (scenario.description.length > 5000) {
      return NextResponse.json(
        { error: 'Scenario description must be less than 5000 characters' },
        { status: 400 }
      );
    }

    // Get advice
    const advice = await zeitgeist.getAdvice(scenario);

    return NextResponse.json(advice);
  } catch (error) {
    console.error('Advice generation failed:', error);
    // SECURITY: Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        error: 'Failed to generate advice',
        details: isProduction ? undefined : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}
