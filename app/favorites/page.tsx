'use client';

import { useUser } from '@clerk/nextjs';
import { Navigation } from '@/components/Navigation';
import { FavoritesList } from '@/components/favorites/FavoritesList';
import { Loader2, Heart } from 'lucide-react';

export default function FavoritesPage() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900 flex items-center justify-center">
          <Loader2 className="animate-spin text-purple-600" size={48} />
        </div>
      </>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Please sign in
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You need to be signed in to view your favorites
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Heart size={32} className="text-red-600 dark:text-red-400" />
              <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
                Favorites
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Your saved vibes and advice
            </p>
          </div>

          {/* Favorites List */}
          <FavoritesList />
        </div>
      </div>
    </>
  );
}
