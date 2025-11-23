'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export interface UsageStats {
  userId: string;
  tier: 'free' | 'light' | 'regular' | 'unlimited';
  queriesThisMonth: number;
  queryLimit: number;
  resetDate: string;
  topRegions: Array<{ region: string; count: number }>;
  topInterests: Array<{ interest: string; count: number }>;
  averageRating: number;
  totalQueries: number;
}

export function useUserUsage() {
  const { isSignedIn, isLoaded } = useUser();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setUsage(null);
      setLoading(false);
      return;
    }

    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/user/usage');
        if (!response.ok) {
          throw new Error('Failed to fetch usage stats');
        }
        const data = await response.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage stats');
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [isSignedIn, isLoaded]);

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/usage');
      if (!response.ok) {
        throw new Error('Failed to fetch usage stats');
      }
      const data = await response.json();
      setUsage(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage stats');
    } finally {
      setLoading(false);
    }
  };

  return {
    usage,
    loading,
    error,
    refresh,
  };
}
