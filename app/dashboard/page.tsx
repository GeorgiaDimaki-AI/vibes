'use client';

import { useUser } from '@clerk/nextjs';
import { Navigation } from '@/components/Navigation';
import { UsageDashboard } from '@/components/profile/UsageDashboard';
import { Loader2, LayoutDashboard, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
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
              You need to be signed in to view your dashboard
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
              <LayoutDashboard size={32} className="text-purple-600 dark:text-purple-400" />
              <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
                Dashboard
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Track your usage and analytics
            </p>
          </div>

          {/* Usage Dashboard */}
          <div className="mb-8">
            <UsageDashboard />
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/history"
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow group"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                Advice History
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Review and rate your past advice requests
              </p>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium group-hover:gap-3 transition-all">
                View History
                <ArrowRight size={16} />
              </div>
            </Link>

            <Link
              href="/favorites"
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow group"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                Favorites
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Your saved vibes and advice
              </p>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium group-hover:gap-3 transition-all">
                View Favorites
                <ArrowRight size={16} />
              </div>
            </Link>

            <Link
              href="/profile"
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow group"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                Profile Settings
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Manage your profile and preferences
              </p>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium group-hover:gap-3 transition-all">
                Edit Profile
                <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
