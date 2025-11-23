'use client';

import { useState } from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { AdviceHistoryItem } from './AdviceHistoryItem';
import { Filter, SortAsc, SortDesc, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export function AdviceHistoryList() {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest-rated'>('newest');
  const { history, loading, error, hasMore, deleteHistoryItem, rateAdvice } = useHistory(
    ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  if (loading && page === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-48"
          ></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          No advice history yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Start by getting some advice and it will appear here
        </p>
      </div>
    );
  }

  // Sort history
  const sortedHistory = [...history].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'oldest':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'highest-rated':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Filter size={16} />
          <span>
            Showing {page * ITEMS_PER_PAGE + 1}-
            {Math.min((page + 1) * ITEMS_PER_PAGE, history.length)} of {history.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-gray-600 dark:text-gray-400">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest-rated">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {sortedHistory.map((item) => (
          <AdviceHistoryItem
            key={item.id}
            item={item}
            onDelete={deleteHistoryItem}
            onRate={rateAdvice}
          />
        ))}
      </div>

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page + 1}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
