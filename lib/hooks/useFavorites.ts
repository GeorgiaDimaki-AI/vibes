'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

export interface UserFavorite {
  id: string;
  userId: string;
  type: 'vibe' | 'advice';
  referenceId: string;
  timestamp: string;
  note?: string;
}

export function useFavorites(type?: 'vibe' | 'advice') {
  const { isSignedIn, isLoaded } = useUser();
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = async () => {
    if (!isSignedIn) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const url = type
        ? `/api/favorites?type=${type}`
        : '/api/favorites';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }
      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    fetchFavorites();
  }, [isSignedIn, isLoaded, type]);

  const addFavorite = async (
    type: 'vibe' | 'advice',
    referenceId: string,
    note?: string
  ) => {
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, referenceId, note }),
      });
      if (!response.ok) {
        throw new Error('Failed to add favorite');
      }
      const data = await response.json();

      // Refresh favorites
      await fetchFavorites();

      return data.favoriteId;
    } catch (err) {
      throw err;
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const response = await fetch(`/api/favorites/${favoriteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove favorite');
      }

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
    } catch (err) {
      throw err;
    }
  };

  const isFavorite = (referenceId: string) => {
    return favorites.some(fav => fav.referenceId === referenceId);
  };

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    refresh: fetchFavorites,
  };
}
