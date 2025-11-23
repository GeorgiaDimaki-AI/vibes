/**
 * History API Routes
 * GET /api/history - Get user's advice history
 * DELETE /api/history - Delete all history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/graph';
import { HistoryService } from '@/lib/users/history-service';

/**
 * GET /api/history?limit=20&offset=0
 * Get user's advice history with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual auth when Agent 3 implements it
    // For now, use a test user ID from query params
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: userId required for testing' },
        { status: 401 }
      );
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const store = getStore();
    const historyService = new HistoryService(store);

    const history = await historyService.getHistory(userId, limit, offset);

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Error getting history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get history' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/history
 * Delete all history for the user
 */
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Replace with actual auth when Agent 3 implements it
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: userId required for testing' },
        { status: 401 }
      );
    }

    const store = getStore();
    const historyService = new HistoryService(store);

    await historyService.deleteAllHistory(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete history' },
      { status: 500 }
    );
  }
}
