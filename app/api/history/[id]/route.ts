/**
 * History Item API Routes
 * GET /api/history/[id] - Get specific history item
 * PUT /api/history/[id] - Rate advice or mark helpful
 * DELETE /api/history/[id] - Delete specific history item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/graph';
import { HistoryService } from '@/lib/users/history-service';

/**
 * GET /api/history/[id]
 * Get a specific history item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const item = await historyService.getHistoryItem(params.id, userId);

    if (!item) {
      return NextResponse.json(
        { error: 'History item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error getting history item:', error);

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to get history item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/history/[id]
 * Rate advice or mark as helpful
 * Body: { rating?: number, feedback?: string, wasHelpful?: boolean }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Replace with actual auth when Agent 3 implements it
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: userId required for testing' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, feedback, wasHelpful } = body;

    const store = getStore();
    const historyService = new HistoryService(store);

    // Update rating if provided
    if (rating !== undefined) {
      await historyService.rateAdvice(params.id, userId, rating, feedback);
    }

    // Update helpful status if provided
    if (wasHelpful !== undefined) {
      await historyService.markHelpful(params.id, userId, wasHelpful);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating history item:', error);

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('Rating must be')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update history item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/history/[id]
 * Delete a specific history item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await historyService.deleteHistory(params.id, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting history item:', error);

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete history item' },
      { status: 500 }
    );
  }
}
