'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Advice, Scenario } from '@/lib/types';

export interface AdviceHistory {
  id: string;
  userId: string;
  timestamp: string;
  scenario: Scenario;
  matchedVibes: string[];
  advice: Advice;
  rating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  wasHelpful?: boolean;
  regionFilterApplied?: string;
  interestBoostsApplied: string[];
}

export function useHistory(limit: number = 20, offset: number = 0) {
  const { isSignedIn, isLoaded } = useUser();
  const [history, setHistory] = useState<AdviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `/api/history?limit=${limit}&offset=${offset}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        const data = await response.json();
        setHistory(data.history || []);
        setHasMore(data.hasMore || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isSignedIn, isLoaded, limit, offset]);

  const deleteHistoryItem = async (id: string) => {
    try {
      const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete history item');
      }
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const rateAdvice = async (
    id: string,
    rating: number,
    feedback?: string,
    wasHelpful?: boolean
  ) => {
    try {
      const response = await fetch(`/api/history/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback, wasHelpful }),
      });
      if (!response.ok) {
        throw new Error('Failed to rate advice');
      }

      // Update local state
      setHistory(prev =>
        prev.map(item =>
          item.id === id ? { ...item, rating: rating as 1 | 2 | 3 | 4 | 5, feedback, wasHelpful } : item
        )
      );
    } catch (err) {
      throw err;
    }
  };

  return {
    history,
    loading,
    error,
    hasMore,
    deleteHistoryItem,
    rateAdvice,
  };
}
