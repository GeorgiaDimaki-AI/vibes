'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/lib/hooks/useFavorites';
import toast from 'react-hot-toast';

interface FavoriteButtonProps {
  type: 'vibe' | 'advice';
  referenceId: string;
  size?: number;
  showLabel?: boolean;
}

export function FavoriteButton({
  type,
  referenceId,
  size = 20,
  showLabel = false,
}: FavoriteButtonProps) {
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites(type);
  const [loading, setLoading] = useState(false);

  const favorited = isFavorite(referenceId);
  const favorite = favorites.find((f) => f.referenceId === referenceId);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (favorited && favorite) {
        await removeFavorite(favorite.id);
        toast.success('Removed from favorites');
      } else {
        await addFavorite(type, referenceId);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        favorited
          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        size={size}
        className={favorited ? 'fill-current' : ''}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {favorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </button>
  );
}
