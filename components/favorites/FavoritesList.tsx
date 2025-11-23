'use client';

import { useState } from 'react';
import { useFavorites } from '@/lib/hooks/useFavorites';
import { Heart, Grid, List, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function FavoritesList() {
  const [activeTab, setActiveTab] = useState<'vibe' | 'advice'>('advice');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const { favorites, loading, error, removeFavorite } = useFavorites(activeTab);

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this favorite?')) {
      return;
    }

    try {
      await removeFavorite(id);
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-32"
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

  const filteredFavorites = favorites.filter((fav) => {
    if (!searchQuery) return true;
    return (
      fav.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fav.note?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('advice')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'advice'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Advice
          </button>
          <button
            onClick={() => setActiveTab('vibe')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'vibe'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Vibes
          </button>
        </div>

        {/* View Mode & Search */}
        <div className="flex gap-2 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search favorites..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              aria-label="List view"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              aria-label="Grid view"
            >
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredFavorites.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">
            <Heart size={64} className="inline text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            No favorites yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? 'No favorites match your search'
              : `Start favoriting ${activeTab === 'vibe' ? 'vibes' : 'advice'} to see them here`}
          </p>
        </div>
      )}

      {/* Favorites List/Grid */}
      {filteredFavorites.length > 0 && (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
          }
        >
          {filteredFavorites.map((favorite) => (
            <div
              key={favorite.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {new Date(favorite.timestamp).toLocaleDateString()}
                  </p>
                  <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                    {favorite.referenceId}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(favorite.id)}
                  className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  aria-label="Remove from favorites"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {favorite.note && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                  {favorite.note}
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="inline-block px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 rounded">
                  {favorite.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
