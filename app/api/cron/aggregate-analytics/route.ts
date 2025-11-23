/**
 * Analytics Aggregation Cron Job
 * Runs monthly to aggregate usage metrics for all users
 *
 * SECURITY: Requires cron secret authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/graph';
import { AnalyticsService } from '@/lib/users/analytics-service';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    // STEP 1: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== expectedAuth) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // STEP 2: Get all active users (users with queries in the last 3 months)
    const store = getStore();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Query for active users
    let activeUsers: Array<{ id: string }> = [];

    try {
      // Try to get active users from Postgres
      const result = await sql`
        SELECT DISTINCT u.id
        FROM users u
        WHERE u.last_active >= ${threeMonthsAgo.toISOString()}
        ORDER BY u.last_active DESC
      `;
      activeUsers = result.rows;
    } catch (error) {
      // If Postgres query fails (e.g., in memory mode), we'll skip aggregation
      console.warn('Could not query active users from database:', error);
      return NextResponse.json({
        success: true,
        message: 'Skipped aggregation (in-memory mode or database unavailable)',
        usersProcessed: 0,
      });
    }

    // STEP 3: Aggregate metrics for each active user
    const analyticsService = new AnalyticsService(store);
    let successCount = 0;
    let errorCount = 0;

    for (const user of activeUsers) {
      try {
        await analyticsService.aggregateMonthlyMetrics(user.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to aggregate metrics for user ${user.id}:`, error);
        errorCount++;
      }
    }

    // STEP 4: Return summary
    return NextResponse.json({
      success: true,
      usersProcessed: successCount,
      errors: errorCount,
      totalUsers: activeUsers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics aggregation cron failed:', error);
    return NextResponse.json(
      {
        error: 'Aggregation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
